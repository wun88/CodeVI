import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiKey } from '../api-key/entities/api-key.entity';
import { MetricService } from '../metric/metric.service';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { User } from '../users/entities/user.entity';
import { CreateMetricAnalysisRequestDto } from './dto/create-metric-analysis-request.dto';
import {
  MetricAnalysisDetailDto,
  MetricAnalysisExecutionResponseDto,
  MetricAnalysisListItemDto,
} from './dto/metric-analysis-response.dto';
import { QueryMetricAnalysisRequestDto } from './dto/query-metric-analysis-request.dto';
import { MetricAnalysisJob } from './entities/metric-analysis-job.entity';
import { MetricAnalysisResult } from './entities/metric-analysis-result.entity';
import { MetricAnalysisStatus } from './entities/metric-analysis-status.enum';
import { MetricAnalysisType } from './entities/metric-analysis-type.enum';
import { MetricSourceType } from './entities/metric-source-type.enum';

@Injectable()
export class MetricAnalysisService {
  private readonly logger = new Logger(MetricAnalysisService.name);

  constructor(
    @InjectRepository(MetricAnalysisJob)
    private readonly metricAnalysisJobRepository: Repository<MetricAnalysisJob>,
    @InjectRepository(MetricAnalysisResult)
    private readonly metricAnalysisResultRepository: Repository<MetricAnalysisResult>,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
    private readonly metricService: MetricService,
  ) {}

  /**
   * 메트릭 분석 요청을 생성하고 결과를 저장합니다.
   */
  async createAnalysis(
    dto: CreateMetricAnalysisRequestDto,
    user?: User,
    apiKey?: ApiKey,
  ): Promise<MetricAnalysisExecutionResponseDto> {
    this.validateRequestPayload(dto);

    const teamProject = await this.getAuthorizedTeamProject(
      dto.teamProjectId,
      user,
      apiKey,
    );

    const job = await this.metricAnalysisJobRepository.save(
      this.metricAnalysisJobRepository.create({
        status: MetricAnalysisStatus.PENDING,
        analysisType: dto.analysisType,
        sourceType: dto.sourceType,
        filePath: dto.filePath ?? null,
        errorMessage: null,
        completedAt: null,
        teamProjectId: teamProject.id,
        requestedByUserId: user?.id ?? null,
        apiKeyId: apiKey?.id ?? null,
      }),
    );

    try {
      const astData = dto.astData as any;
      const normalizedResult = this.runMetricAnalysis(
        dto.analysisType,
        astData,
        dto.filePath ?? 'unknown',
        dto.sourceCode,
      );

      const resultEntity = new MetricAnalysisResult();
      resultEntity.jobId = job.id;
      resultEntity.summaryJson = normalizedResult.summary;
      resultEntity.classicJson = normalizedResult.classic;
      resultEntity.ckJson = normalizedResult.ck;
      resultEntity.ooJson = normalizedResult.oo;
      resultEntity.smellsJson = normalizedResult.smells;

      await this.metricAnalysisResultRepository.save(resultEntity);

      job.status = MetricAnalysisStatus.SUCCESS;
      job.completedAt = new Date();
      await this.metricAnalysisJobRepository.save(job);

      return {
        jobId: job.id,
        status: job.status,
        teamProjectId: teamProject.id,
        analysisType: dto.analysisType,
        result: normalizedResult,
      };
    } catch (error) {
      job.status = MetricAnalysisStatus.FAILED;
      job.completedAt = new Date();
      job.errorMessage =
        error instanceof Error ? error.message : 'Unknown analysis error';
      await this.metricAnalysisJobRepository.save(job);

      this.logger.error(
        `Metric analysis failed for jobId=${job.id}: ${job.errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * 접근 가능한 프로젝트 범위 내에서 분석 이력 목록을 조회합니다.
   */
  async getAnalyses(
    query: QueryMetricAnalysisRequestDto,
    user?: User,
    apiKey?: ApiKey,
  ): Promise<MetricAnalysisListItemDto[]> {
    const accessibleProjectIds = await this.getAccessibleProjectIds(user, apiKey);

    if (query.teamProjectId && !accessibleProjectIds.includes(query.teamProjectId)) {
      throw new ForbiddenException('No access to the requested team project');
    }

    const filteredProjectIds = query.teamProjectId
      ? [query.teamProjectId]
      : accessibleProjectIds;

    const jobs = await this.metricAnalysisJobRepository.find({
      where: {
        teamProjectId: In(filteredProjectIds),
        ...(query.analysisType ? { analysisType: query.analysisType } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      order: { createdAt: 'DESC' },
    });

    return jobs.map((job) => this.toListItemDto(job));
  }

  /**
   * 접근 가능한 프로젝트 범위 내에서 분석 결과 단건을 조회합니다.
   */
  async getAnalysisDetail(
    jobId: number,
    user?: User,
    apiKey?: ApiKey,
  ): Promise<MetricAnalysisDetailDto> {
    const accessibleProjectIds = await this.getAccessibleProjectIds(user, apiKey);
    const job = await this.metricAnalysisJobRepository.findOne({
      where: { id: jobId },
      relations: ['result'],
    });

    if (!job) {
      throw new NotFoundException(`Metric analysis with ID ${jobId} not found`);
    }

    if (!accessibleProjectIds.includes(job.teamProjectId)) {
      throw new ForbiddenException('No access to this metric analysis');
    }

    return this.toDetailDto(job);
  }

  /**
   * 현재 MVP는 AST 기반 계산만 지원하므로 입력을 명시적으로 제한합니다.
   */
  private validateRequestPayload(dto: CreateMetricAnalysisRequestDto): void {
    if (!dto.astData) {
      throw new BadRequestException(
        'astData is required for metric analysis in the current MVP',
      );
    }

    if (dto.sourceType === MetricSourceType.SOURCE_CODE && !dto.sourceCode) {
      throw new BadRequestException(
        'sourceCode is required when sourceType is source_code',
      );
    }
  }

  /**
   * 사용자 또는 API Key가 프로젝트 접근 권한을 갖는지 확인합니다.
   */
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
      throw new NotFoundException(
        `TeamProject with ID ${teamProjectId} not found`,
      );
    }

    if (user) {
      const isMember = teamProject.users.some(
        (teamUser) => teamUser.id === user.id,
      );
      if (!isMember) {
        throw new ForbiddenException('User has no access to this team project');
      }
      return teamProject;
    }

    if (apiKey) {
      if (apiKey.teamProjectId && apiKey.teamProjectId !== teamProjectId) {
        throw new ForbiddenException(
          'API key is restricted to a different team project',
        );
      }

      const isOwnerMember = teamProject.users.some(
        (teamUser) => teamUser.id === apiKey.userId,
      );
      if (!isOwnerMember) {
        throw new ForbiddenException(
          'API key owner has no access to this team project',
        );
      }
      return teamProject;
    }

    throw new ForbiddenException('No authentication principal found');
  }

  /**
   * 사용자 또는 API Key가 조회 가능한 프로젝트 ID 목록을 계산합니다.
   */
  private async getAccessibleProjectIds(
    user?: User,
    apiKey?: ApiKey,
  ): Promise<number[]> {
    if (user) {
      const projects = await this.teamProjectRepository
        .createQueryBuilder('teamProject')
        .leftJoin('teamProject.users', 'user')
        .where('user.id = :userId', { userId: user.id })
        .select('teamProject.id', 'id')
        .getRawMany<{ id: number }>();

      return projects.map((project) => Number(project.id));
    }

    if (apiKey) {
      if (apiKey.teamProjectId) {
        return [apiKey.teamProjectId];
      }

      const projects = await this.teamProjectRepository
        .createQueryBuilder('teamProject')
        .leftJoin('teamProject.users', 'user')
        .where('user.id = :userId', { userId: apiKey.userId })
        .select('teamProject.id', 'id')
        .getRawMany<{ id: number }>();

      return projects.map((project) => Number(project.id));
    }

    throw new ForbiddenException('No authentication principal found');
  }

  /**
   * 기존 MetricService를 재사용해 분석 타입별 결과를 구성합니다.
   */
  private runMetricAnalysis(
    analysisType: MetricAnalysisType,
    astData: any,
    filePath: string,
    sourceCode?: string,
  ) {
    if (analysisType === MetricAnalysisType.FULL) {
      const fileResult = this.metricService.analyzeFile(astData, filePath, sourceCode);
      return {
        summary: {
          classCount: fileResult.classes.length,
          codeSmellCount: fileResult.codeSmells.length,
        },
        classic: fileResult.classic,
        ck: fileResult.classes,
        oo: fileResult.ooMetrics,
        smells: fileResult.codeSmells,
      };
    }

    if (analysisType === MetricAnalysisType.CLASSIC) {
      const classic = this.metricService.calculateClassicMetrics(astData, sourceCode);
      return {
        summary: { classCount: 0, codeSmellCount: 0 },
        classic,
        ck: null,
        oo: null,
        smells: null,
      };
    }

    if (analysisType === MetricAnalysisType.CK) {
      const ck = this.metricService.calculateAllCKMetrics(astData);
      return {
        summary: { classCount: ck.length, codeSmellCount: 0 },
        classic: null,
        ck,
        oo: null,
        smells: null,
      };
    }

    if (analysisType === MetricAnalysisType.OO) {
      const oo = this.metricService.calculateAllOOMetrics(astData);
      return {
        summary: { classCount: oo.length, codeSmellCount: 0 },
        classic: null,
        ck: null,
        oo,
        smells: null,
      };
    }

    const smells = this.metricService.detectCodeSmells(astData, filePath);
    return {
      summary: { classCount: 0, codeSmellCount: smells.length },
      classic: null,
      ck: null,
      oo: null,
      smells,
    };
  }

  /**
   * 목록 조회용 경량 DTO로 변환합니다.
   */
  private toListItemDto(job: MetricAnalysisJob): MetricAnalysisListItemDto {
    return {
      jobId: job.id,
      status: job.status,
      teamProjectId: job.teamProjectId,
      analysisType: job.analysisType,
      filePath: job.filePath,
      requestedAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * 상세 조회용 DTO로 변환합니다.
   */
  private toDetailDto(job: MetricAnalysisJob): MetricAnalysisDetailDto {
    return {
      ...this.toListItemDto(job),
      errorMessage: job.errorMessage,
      result: {
        summary: (job.result?.summaryJson ?? {
          classCount: 0,
          codeSmellCount: 0,
        }) as any,
        classic: (job.result?.classicJson ?? null) as any,
        ck: (job.result?.ckJson ?? null) as any,
        oo: (job.result?.ooJson ?? null) as any,
        smells: (job.result?.smellsJson ?? null) as any,
      },
    };
  }
}
