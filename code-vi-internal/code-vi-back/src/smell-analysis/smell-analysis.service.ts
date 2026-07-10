import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ApiKey } from '../api-key/entities/api-key.entity';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { User } from '../users/entities/user.entity';
import { SmellAnalysisJob } from './entities/smell-analysis-job.entity';
import { SmellAnalysisFinding } from './entities/smell-analysis-finding.entity';
import { SmellAnalysisStatus } from './entities/smell-analysis-status.enum';
import { CreateSmellAnalysisRequestDto } from './dto/create-smell-analysis-request.dto';
import {
  QuerySmellAnalysisRequestDto,
  QuerySmellFindingsRequestDto,
} from './dto/query-smell-analysis-request.dto';
import {
  SmellAnalysisDetailDto,
  SmellAnalysisExecutionResponseDto,
  SmellAnalysisFindingItemDto,
  SmellAnalysisFindingsResponseDto,
  SmellAnalysisListItemDto,
  SmellSummaryDto,
} from './dto/smell-analysis-response.dto';

/**
 * SmellAnalysisService
 *
 * code smell 분석 요청 실행, 저장, 조회를 담당한다.
 * analyzer 호출은 Option A(MCP server의 analyze_python_smells)를 통해 수행한다.
 * 초기 구현은 advanced-pyexamine-service HTTP 직접 호출 방식을 사용한다.
 *
 * 참고: docs/codevi-smell-analysis-contract.md
 */
@Injectable()
export class SmellAnalysisService {
  private readonly logger = new Logger(SmellAnalysisService.name);

  constructor(
    @InjectRepository(SmellAnalysisJob)
    private readonly jobRepository: Repository<SmellAnalysisJob>,
    @InjectRepository(SmellAnalysisFinding)
    private readonly findingRepository: Repository<SmellAnalysisFinding>,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // 분석 실행 및 저장
  // ---------------------------------------------------------------------------

  /**
   * POST /smell-analyses
   *
   * 1. teamProject 접근 권한 검증
   * 2. SmellAnalysisJob PENDING 생성
   * 3. analyzer service 호출 (advanced-pyexamine-service /analyze)
   * 4. 결과 저장 (summary + findings)
   * 5. 성공/실패 job 업데이트
   */
  async createSmellAnalysis(
    dto: CreateSmellAnalysisRequestDto,
    user?: User,
    apiKey?: ApiKey,
  ): Promise<SmellAnalysisExecutionResponseDto> {
    const teamProject = await this.getAuthorizedTeamProject(
      dto.teamProjectId,
      user,
      apiKey,
    );

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        teamProjectId: teamProject.id,
        codeAnalysisId: dto.codeAnalysisId ?? null,
        metricAnalysisJobId: dto.metricAnalysisJobId ?? null,
        buildNumber: dto.buildNumber ?? null,
        commitHash: dto.commitHash ?? null,
        sourceRef: dto.sourceRef ?? null,
        language: dto.language,
        analyzer: dto.analyzer,
        analyzerVersion: null,
        status: SmellAnalysisStatus.PENDING,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        summaryTotal: 0,
        summaryBySeverity: {},
        summaryByName: {},
        requestOptions: dto.options ? { ...dto.options } : null,
        rawResult: null,
        errorCode: null,
        errorMessage: null,
        requestedByUserId: user?.id ?? null,
        apiKeyId: apiKey?.id ?? null,
      }),
    );

    const startedAt = new Date();

    try {
      job.status = SmellAnalysisStatus.RUNNING;
      job.startedAt = startedAt;
      await this.jobRepository.save(job);

      const analyzerResult = await this.callAnalyzerService(dto);

      const summary: SmellSummaryDto = analyzerResult.summary ?? {
        total: 0,
        bySeverity: {},
        byName: {},
      };

      // findings 저장
      const smellGroups: Record<string, unknown[]> =
        (analyzerResult.smellGroups as Record<string, unknown[]>) ?? {};
      const findings = this.buildFindings(job.id, teamProject.id, dto.language, smellGroups);
      if (findings.length > 0) {
        await this.findingRepository.save(findings);
      }

      const completedAt = new Date();
      job.status = SmellAnalysisStatus.SUCCESS;
      job.startedAt = startedAt;
      job.completedAt = completedAt;
      job.durationMs = completedAt.getTime() - startedAt.getTime();
      job.summaryTotal = summary.total;
      job.summaryBySeverity = summary.bySeverity;
      job.summaryByName = summary.byName;
      job.rawResult = analyzerResult;
      job.errorCode = null;
      job.errorMessage = null;
      await this.jobRepository.save(job);

      return {
        jobId: job.id,
        status: job.status,
        teamProjectId: teamProject.id,
        language: dto.language,
        analyzer: dto.analyzer,
        summary,
        response: {
          summaryOnly: dto.options?.summaryOnly ?? false,
          returnedTotal: analyzerResult.response?.returnedTotal ?? findings.length,
          truncated: analyzerResult.response?.truncated ?? false,
          limitPerGroup: dto.options?.limitPerGroup,
        },
      };
    } catch (error) {
      const completedAt = new Date();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown analysis error';

      job.status = SmellAnalysisStatus.FAILED;
      job.completedAt = completedAt;
      job.durationMs = completedAt.getTime() - startedAt.getTime();
      job.summaryTotal = 0;
      job.summaryBySeverity = {};
      job.summaryByName = {};
      job.errorCode = this.classifyErrorCode(error);
      job.errorMessage = errorMessage;
      await this.jobRepository.save(job);

      this.logger.error(
        `Smell analysis failed for jobId=${job.id}: ${errorMessage}`,
      );
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // 목록 조회
  // ---------------------------------------------------------------------------

  async getSmellAnalyses(
    query: QuerySmellAnalysisRequestDto,
    user?: User,
    apiKey?: ApiKey,
  ): Promise<{ items: SmellAnalysisListItemDto[]; total: number }> {
    const accessibleProjectIds = await this.getAccessibleProjectIds(user, apiKey);

    if (query.teamProjectId && !accessibleProjectIds.includes(query.teamProjectId)) {
      throw new ForbiddenException('No access to the requested team project');
    }

    const filteredProjectIds = query.teamProjectId
      ? [query.teamProjectId]
      : accessibleProjectIds;

    const where = {
      teamProjectId: In(filteredProjectIds),
      ...(query.language ? { language: query.language } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.analyzer ? { analyzer: query.analyzer } : {}),
      ...(query.buildNumber !== undefined ? { buildNumber: query.buildNumber } : {}),
      ...(query.commitHash ? { commitHash: query.commitHash } : {}),
    };

    const [jobs, total] = await this.jobRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      ...(query.offset !== undefined ? { skip: query.offset } : {}),
      ...(query.limit !== undefined ? { take: query.limit } : {}),
    });

    return { items: jobs.map((job) => this.toListItemDto(job)), total };
  }

  // ---------------------------------------------------------------------------
  // 단건 상세 조회
  // ---------------------------------------------------------------------------

  async getSmellAnalysisDetail(
    jobId: number,
    user?: User,
    apiKey?: ApiKey,
  ): Promise<SmellAnalysisDetailDto> {
    const accessibleProjectIds = await this.getAccessibleProjectIds(user, apiKey);

    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['findings'],
    });

    if (!job) {
      throw new NotFoundException(`SmellAnalysisJob with ID ${jobId} not found`);
    }

    if (!accessibleProjectIds.includes(job.teamProjectId)) {
      throw new ForbiddenException('No access to this smell analysis');
    }

    return this.toDetailDto(job);
  }

  // ---------------------------------------------------------------------------
  // Finding 필터 조회
  // ---------------------------------------------------------------------------

  async getSmellFindings(
    jobId: number,
    query: QuerySmellFindingsRequestDto,
    user?: User,
    apiKey?: ApiKey,
  ): Promise<SmellAnalysisFindingsResponseDto> {
    const accessibleProjectIds = await this.getAccessibleProjectIds(user, apiKey);

    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`SmellAnalysisJob with ID ${jobId} not found`);
    }

    if (!accessibleProjectIds.includes(job.teamProjectId)) {
      throw new ForbiddenException('No access to this smell analysis');
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const qb = this.findingRepository
      .createQueryBuilder('finding')
      .where('finding.smellAnalysisJobId = :jobId', { jobId });

    if (query.severity) qb.andWhere('finding.severity = :severity', { severity: query.severity });
    if (query.name) qb.andWhere('finding.name = :name', { name: query.name });
    if (query.category) qb.andWhere('finding.category = :category', { category: query.category });
    if (query.filePath) qb.andWhere('finding.filePath LIKE :filePath', { filePath: `${query.filePath}%` });

    const total = await qb.getCount();
    const findings = await qb.skip(offset).take(limit).getMany();

    return {
      items: findings.map((f) => this.toFindingItemDto(f)),
      total,
      limit,
      offset,
    };
  }

  // ---------------------------------------------------------------------------
  // Analyzer 호출 (advanced-pyexamine-service /analyze)
  // ---------------------------------------------------------------------------

  private async callAnalyzerService(dto: CreateSmellAnalysisRequestDto): Promise<any> {
    const serviceUrl = this.configService.get<string>('ADVANCED_PYEXAMINE_SERVICE_URL');
    if (!serviceUrl) {
      throw new BadGatewayException(
        'ADVANCED_PYEXAMINE_SERVICE_URL is not configured. (ANALYZER_NOT_CONFIGURED)',
      );
    }

    const payload: Record<string, unknown> = {
      projectPath: dto.projectPath,
    };
    if (dto.options?.only) payload.only = dto.options.only;
    if (dto.options?.summaryOnly !== undefined) payload.summaryOnly = dto.options.summaryOnly;
    if (dto.options?.limitPerGroup !== undefined) payload.limitPerGroup = dto.options.limitPerGroup;

    try {
      const response = await axios.post(`${serviceUrl}/analyze`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        const message =
          (response.data as any)?.error?.message ??
          `Analyzer service returned HTTP ${response.status}`;
        throw new BadGatewayException(`ANALYZER_SERVICE_FAILED: ${message}`);
      }

      return response.data;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      const isTimeout =
        (error as any)?.code === 'ECONNABORTED' ||
        (error as any)?.message?.includes('timeout');

      if (isTimeout) {
        throw new BadGatewayException('ANALYZER_TIMEOUT: Analyzer service did not respond in time.');
      }

      throw new BadGatewayException(
        `ANALYZER_SERVICE_FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 권한 검증 헬퍼 (metric-analysis.service.ts 패턴 동일)
  // ---------------------------------------------------------------------------

  private async getAuthorizedTeamProject(
    teamProjectId: number,
    user?: User,
    apiKey?: ApiKey,
  ): Promise<TeamProject> {
    const teamProject = await this.teamProjectRepository.findOne({
      where: { id: teamProjectId },
      relations: ['users'],
    });

    if (!teamProject) {
      throw new NotFoundException(`TeamProject with ID ${teamProjectId} not found`);
    }

    if (user) {
      const isMember = teamProject.users.some((u) => u.id === user.id);
      if (!isMember) {
        throw new ForbiddenException('User has no access to this team project');
      }
      return teamProject;
    }

    if (apiKey) {
      if (apiKey.teamProjectId && apiKey.teamProjectId !== teamProjectId) {
        throw new ForbiddenException('API key is restricted to a different team project');
      }
      const isOwnerMember = teamProject.users.some((u) => u.id === apiKey.userId);
      if (!isOwnerMember) {
        throw new ForbiddenException('API key owner has no access to this team project');
      }
      return teamProject;
    }

    throw new ForbiddenException('No authentication principal found');
  }

  private async getAccessibleProjectIds(user?: User, apiKey?: ApiKey): Promise<number[]> {
    if (user) {
      const projects = await this.teamProjectRepository
        .createQueryBuilder('teamProject')
        .leftJoin('teamProject.users', 'user')
        .where('user.id = :userId', { userId: user.id })
        .select('teamProject.id', 'id')
        .getRawMany<{ id: number }>();
      return projects.map((p) => Number(p.id));
    }

    if (apiKey) {
      if (apiKey.teamProjectId) return [apiKey.teamProjectId];

      const projects = await this.teamProjectRepository
        .createQueryBuilder('teamProject')
        .leftJoin('teamProject.users', 'user')
        .where('user.id = :userId', { userId: apiKey.userId })
        .select('teamProject.id', 'id')
        .getRawMany<{ id: number }>();
      return projects.map((p) => Number(p.id));
    }

    throw new ForbiddenException('No authentication principal found');
  }

  // ---------------------------------------------------------------------------
  // Finding 변환 헬퍼
  // ---------------------------------------------------------------------------

  private buildFindings(
    jobId: number,
    teamProjectId: number,
    language: string,
    smellGroups: Record<string, unknown[]>,
  ): SmellAnalysisFinding[] {
    const findings: SmellAnalysisFinding[] = [];

    for (const [, smells] of Object.entries(smellGroups)) {
      for (const smell of smells) {
        const s = smell as Record<string, any>;
        const finding = this.findingRepository.create({
          smellAnalysisJobId: jobId,
          teamProjectId,
          language,
          name: s.name ?? 'unknown',
          category: s.category ?? null,
          severity: s.severity ?? 'unknown',
          filePath: s.location?.file ?? null,
          lineStart: s.location?.line_start ?? null,
          lineEnd: s.location?.line_end ?? null,
          entity: s.entity ?? null,
          message: s.message ?? null,
          metrics: s.metrics ?? null,
          relatedLocations: s.related_locations ?? null,
          rawFinding: s,
        });
        findings.push(finding);
      }
    }

    return findings;
  }

  // ---------------------------------------------------------------------------
  // DTO 변환
  // ---------------------------------------------------------------------------

  private toListItemDto(job: SmellAnalysisJob): SmellAnalysisListItemDto {
    return {
      jobId: job.id,
      status: job.status,
      teamProjectId: job.teamProjectId,
      codeAnalysisId: job.codeAnalysisId,
      buildNumber: job.buildNumber,
      commitHash: job.commitHash,
      language: job.language,
      analyzer: job.analyzer,
      summaryTotal: job.summaryTotal,
      summaryBySeverity: job.summaryBySeverity,
      requestedAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  private toDetailDto(job: SmellAnalysisJob): SmellAnalysisDetailDto {
    return {
      ...this.toListItemDto(job),
      summary: {
        total: job.summaryTotal,
        bySeverity: job.summaryBySeverity,
        byName: job.summaryByName,
      },
      findings: (job.findings ?? []).map((f) => this.toFindingItemDto(f)),
      errorMessage: job.errorMessage,
      errorCode: job.errorCode,
    };
  }

  private toFindingItemDto(f: SmellAnalysisFinding): SmellAnalysisFindingItemDto {
    return {
      id: f.id,
      name: f.name,
      category: f.category,
      severity: f.severity,
      filePath: f.filePath,
      lineStart: f.lineStart,
      lineEnd: f.lineEnd,
      entity: f.entity,
      message: f.message,
      metrics: f.metrics,
    };
  }

  private classifyErrorCode(error: unknown): string {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('ANALYZER_TIMEOUT')) return 'ANALYZER_TIMEOUT';
    if (msg.includes('ANALYZER_NOT_CONFIGURED')) return 'ANALYZER_NOT_CONFIGURED';
    if (msg.includes('ANALYZER_SERVICE_FAILED')) return 'ANALYZER_SERVICE_FAILED';
    return 'ANALYZER_SERVICE_FAILED';
  }
}
