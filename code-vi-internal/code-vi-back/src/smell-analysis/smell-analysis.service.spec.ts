import axios from 'axios';
import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SmellAnalysisService } from './smell-analysis.service';
import { SmellAnalysisJob } from './entities/smell-analysis-job.entity';
import { SmellAnalysisFinding } from './entities/smell-analysis-finding.entity';
import { SmellAnalysisStatus } from './entities/smell-analysis-status.enum';

jest.mock('axios');
jest.mock('../team-project/entities/team-project.entity', () => ({
  TeamProject: class TeamProject {},
}));

type MockRepository<T extends object> = Partial<Record<keyof Repository<T>, jest.Mock>>;
type TeamProject = Record<string, unknown>;

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SmellAnalysisService', () => {
  let service: SmellAnalysisService;
  let jobRepository: MockRepository<SmellAnalysisJob>;
  let findingRepository: MockRepository<SmellAnalysisFinding>;
  let teamProjectRepository: MockRepository<TeamProject>;
  let configService: Pick<ConfigService, 'get'>;
  let savedJobs: SmellAnalysisJob[];
  let savedFindings: SmellAnalysisFinding[];

  const user = { id: 2 } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    savedJobs = [];
    savedFindings = [];

    jobRepository = {
      create: jest.fn((entity) => ({ ...entity })),
      save: jest.fn(async (entity) => {
        const job = entity as SmellAnalysisJob;
        if (!job.id) job.id = 10;
        savedJobs.push({ ...job });
        return job;
      }),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };

    findingRepository = {
      create: jest.fn((entity) => ({ ...entity })),
      save: jest.fn(async (entities) => {
        const findings = Array.isArray(entities) ? entities : [entities];
        findings.forEach((finding, index) => {
          if (!finding.id) finding.id = index + 100;
          savedFindings.push({ ...finding });
        });
        return entities;
      }),
      createQueryBuilder: jest.fn(),
    };

    teamProjectRepository = {
      findOne: jest.fn(async () => ({ id: 1, users: [{ id: 2 }] })),
      createQueryBuilder: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ADVANCED_PYEXAMINE_SERVICE_URL') {
          return 'http://advanced-pyexamine-service:18080';
        }
        return undefined;
      }),
    };

    service = new SmellAnalysisService(
      jobRepository as Repository<SmellAnalysisJob>,
      findingRepository as Repository<SmellAnalysisFinding>,
      teamProjectRepository as Repository<TeamProject>,
      configService as ConfigService,
    );
  });

  it('saves a successful advanced-pyexamine result with summary and findings', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        summary: {
          total: 2,
          bySeverity: { high: 1, medium: 1 },
          byName: { long_method: 1, data_clumps: 1 },
        },
        response: { summaryOnly: false, returnedTotal: 2, truncated: false },
        smellGroups: {
          long_method: [
            {
              name: 'long_method',
              category: 'size_metric',
              severity: 'high',
              entity: 'service.run',
              location: { file: 'src/service.py', line_start: 10, line_end: 80 },
              metrics: { loc: 71 },
              message: 'Extract Method',
            },
          ],
          data_clumps: [
            {
              name: 'data_clumps',
              category: 'abstraction_misuse_metric',
              severity: 'medium',
              location: { file: 'src/model.py', line_start: 5, line_end: 12 },
            },
          ],
        },
      },
    });

    const result = await service.createSmellAnalysis(
      {
        teamProjectId: 1,
        language: 'python',
        analyzer: 'advanced_pyexamine',
        projectPath: '/opt/advanced-pyexamine-source/sample_project',
        options: { only: 'long_method,data_clumps', summaryOnly: false, limitPerGroup: 5 },
      },
      user,
    );

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://advanced-pyexamine-service:18080/analyze',
      {
        projectPath: '/opt/advanced-pyexamine-source/sample_project',
        only: 'long_method,data_clumps',
        summaryOnly: false,
        limitPerGroup: 5,
      },
      expect.objectContaining({ timeout: 60000 }),
    );
    expect(result).toMatchObject({
      jobId: 10,
      status: SmellAnalysisStatus.SUCCESS,
      summary: { total: 2 },
      response: { returnedTotal: 2, truncated: false, limitPerGroup: 5 },
    });
    expect(savedFindings).toHaveLength(2);
    expect(savedFindings[0]).toMatchObject({
      smellAnalysisJobId: 10,
      teamProjectId: 1,
      language: 'python',
      name: 'long_method',
      severity: 'high',
      filePath: 'src/service.py',
      lineStart: 10,
      lineEnd: 80,
    });
    expect(savedJobs.at(-1)).toMatchObject({
      status: SmellAnalysisStatus.SUCCESS,
      summaryTotal: 2,
      summaryBySeverity: { high: 1, medium: 1 },
      summaryByName: { long_method: 1, data_clumps: 1 },
      errorCode: null,
      errorMessage: null,
    });
  });

  it('marks the job as failed when the analyzer returns a non-2xx response', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 404,
      data: { error: { message: 'project path not found' } },
    });

    await expect(
      service.createSmellAnalysis(
        {
          teamProjectId: 1,
          language: 'python',
          analyzer: 'advanced_pyexamine',
          projectPath: '/missing',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(savedJobs.at(-1)).toMatchObject({
      status: SmellAnalysisStatus.FAILED,
      summaryTotal: 0,
      summaryBySeverity: {},
      summaryByName: {},
      errorCode: 'ANALYZER_SERVICE_FAILED',
    });
    expect(savedJobs.at(-1)?.errorMessage).toContain('project path not found');
  });

  it('lists only accessible smell analyses with query filters and pagination', async () => {
    const accessibleProjectsQb = createAccessibleProjectsQueryBuilder([1]);
    teamProjectRepository.createQueryBuilder!.mockReturnValueOnce(accessibleProjectsQb);
    jobRepository.findAndCount!.mockResolvedValueOnce([
      [
        {
          id: 3,
          status: SmellAnalysisStatus.SUCCESS,
          teamProjectId: 1,
          codeAnalysisId: null,
          buildNumber: 102,
          commitHash: 'abc123',
          language: 'python',
          analyzer: 'advanced_pyexamine',
          summaryTotal: 43,
          summaryBySeverity: { high: 11, medium: 32 },
          createdAt: new Date('2026-07-03T14:30:00.000Z'),
          completedAt: new Date('2026-07-03T14:30:02.000Z'),
        },
      ],
      1,
    ]);

    const result = await service.getSmellAnalyses(
      {
        teamProjectId: 1,
        language: 'python',
        status: SmellAnalysisStatus.SUCCESS,
        analyzer: 'advanced_pyexamine',
        buildNumber: 102,
        limit: 5,
        offset: 10,
      },
      user,
    );

    expect(jobRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamProjectId: expect.anything(),
          language: 'python',
          status: SmellAnalysisStatus.SUCCESS,
          analyzer: 'advanced_pyexamine',
          buildNumber: 102,
        }),
        skip: 10,
        take: 5,
      }),
    );
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ jobId: 3, summaryTotal: 43 });
  });

  it('rejects list access for a team project outside the caller membership', async () => {
    teamProjectRepository.createQueryBuilder!.mockReturnValueOnce(
      createAccessibleProjectsQueryBuilder([2]),
    );

    await expect(service.getSmellAnalyses({ teamProjectId: 1 }, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('filters smell findings by job, rule metadata, file path, and pagination', async () => {
    teamProjectRepository.createQueryBuilder!.mockReturnValueOnce(
      createAccessibleProjectsQueryBuilder([1]),
    );
    jobRepository.findOne!.mockResolvedValueOnce({ id: 3, teamProjectId: 1 });

    const findingsQb = createFindingsQueryBuilder([
      {
        id: 100,
        name: 'long_method',
        category: 'size_metric',
        severity: 'high',
        filePath: 'src/service.py',
        lineStart: 10,
        lineEnd: 80,
        entity: 'service.run',
        message: 'Extract Method',
        metrics: { loc: 71 },
      },
    ] as SmellAnalysisFinding[]);
    findingRepository.createQueryBuilder!.mockReturnValueOnce(findingsQb);

    const result = await service.getSmellFindings(
      3,
      {
        severity: 'high',
        name: 'long_method',
        category: 'size_metric',
        filePath: 'src/',
        limit: 5,
        offset: 0,
      },
      user,
    );

    expect(findingsQb.where).toHaveBeenCalledWith('finding.smellAnalysisJobId = :jobId', {
      jobId: 3,
    });
    expect(findingsQb.andWhere).toHaveBeenCalledWith('finding.severity = :severity', {
      severity: 'high',
    });
    expect(findingsQb.andWhere).toHaveBeenCalledWith('finding.name = :name', {
      name: 'long_method',
    });
    expect(findingsQb.andWhere).toHaveBeenCalledWith('finding.category = :category', {
      category: 'size_metric',
    });
    expect(findingsQb.andWhere).toHaveBeenCalledWith('finding.filePath LIKE :filePath', {
      filePath: 'src/%',
    });
    expect(findingsQb.skip).toHaveBeenCalledWith(0);
    expect(findingsQb.take).toHaveBeenCalledWith(5);
    expect(result).toMatchObject({ total: 1, limit: 5, offset: 0 });
    expect(result.items[0]).toMatchObject({ id: 100, name: 'long_method' });
  });
});

function createAccessibleProjectsQueryBuilder(ids: number[]) {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(async () => ids.map((id) => ({ id }))),
  };
}

function createFindingsQueryBuilder(findings: SmellAnalysisFinding[]) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(async () => findings.length),
    getMany: jest.fn(async () => findings),
  };
}
