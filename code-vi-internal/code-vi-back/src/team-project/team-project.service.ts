import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { TeamProject } from './entities/team-project.entity';
import { CodeAnalysis } from '../code-analysis/entities/code-analysis.entity';
import { User } from '../users/entities/user.entity';
import { CreateTeamProjectAnalysisDto } from './dto/create-team-project.dto';
import { TeamProjectResponseDto } from './dto/team-project-response.dto';
import { RequirementsService } from '../requirements/requirements.service';

@Injectable()
export class TeamProjectService {
  private readonly logger = new Logger(TeamProjectService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly requirementsService: RequirementsService,
  ) {}

  /**
   * "새 프로젝트 시작하기"(요구사항 우선) — Jenkins/GitHub 연동 없이 TeamProject만 생성한다.
   * jej_20 Phase 1.
   */
  async createRequirementsOnlyProject(
    userId: number,
    teamName: string,
  ): Promise<TeamProjectResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const project = await this.dataSource.transaction(async (manager) => {
      const project = manager.create(TeamProject, {
        teamName,
        JenkinsJobName: null,
        sonarProjectKey: null,
        users: [user],
      });
      return manager.save(project);
    });

    return new TeamProjectResponseDto(project, 0);
  }

  async createJenkinsNotification(dto: CreateTeamProjectAnalysisDto) {
    // 1단계: 핵심 데이터 저장 및 트랜잭션 종료 (최대한 빠르게)
    const savedAnalysis = await this.dataSource.transaction(async (manager) => {
      let project = await manager.findOne(TeamProject, {
        where: { JenkinsJobName: dto.jenkinsJobName },
      });

      if (!project) {
        project = manager.create(TeamProject, {
          teamName: dto.teamName,
          JenkinsJobName: dto.jenkinsJobName,
          sonarProjectKey: dto.sonarProjectKey,
        });
        project = await manager.save(project);
      }

      // [LEGACY REMOVED] AstData JSON 저장 로직 제거됨
      // AST 데이터는 이제 /api/ast-data/relational 엔드포인트를 통해 저장됩니다.

      const newAnalysis = manager.create(CodeAnalysis, {
        ...dto.analysis,
        pyExamineResult: dto.analysis.pyExamineResult,
        teamProject: project,
      });
      return await manager.save(newAnalysis);
    }); // 여기서 트랜잭션이 커밋되고 DB 락이 해제됨

    // 2단계: 트랜잭션 외부에서 비동기로 SonarQube 지표 수집 (Background Process)
    // 응답은 Jenkins에게 즉시 보내고, 데이터 보충은 백그라운드에서 진행
    const targetSonarKey = dto.sonarProjectKey;

    this.fetchAndUpdateSonarMetrics(savedAnalysis.id, targetSonarKey).catch(
      (err: Error) =>
        this.logger.error(`Enrichment Background Error: ${err.message}`),
    );

    return savedAnalysis; // Jenkins에게는 201 Created를 즉시 반환
  }

  private async fetchAndUpdateSonarMetrics(
    analysisId: number,
    projectKey: string,
  ) {
    const sonarToken = this.configService.get<string>('SONAR_TOKEN');
    const metricKeys = [
      'bugs',
      'vulnerabilities',
      'security_hotspots',
      'ncloc',
      'complexity',
      'cognitive_complexity',
      'code_smells',
      'sqale_index',
      'sqale_rating',
      'reliability_rating',
      'security_rating',
    ].join(',');

    const url = `http://sonarqube:9000/api/measures/component?component=${projectKey}&metricKeys=${metricKeys}`;

    const response = await lastValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(sonarToken + ':').toString('base64')}`,
        },
      }),
    );

    const sonarResponse = response.data as {
      component: { measures: { metric: string; value: string }[] };
    };
    const metricsUpdate: Record<string, string> = {};
    sonarResponse.component.measures.forEach((m) => {
      metricsUpdate[m.metric] = m.value;
    });

    // ID 기반으로 수집된 품질 지표 업데이트
    await this.dataSource
      .getRepository(CodeAnalysis)
      .update(analysisId, metricsUpdate);
  }

  async getAllBuildHistory(): Promise<TeamProjectResponseDto[]> {
    const history = await this.dataSource
      .getRepository(CodeAnalysis)
      .createQueryBuilder('analysis')
      .select([
        'analysis.id',
        'analysis.buildNumber',
        'analysis.status',
        'analysis.bugs',
        'analysis.vulnerabilities',
        'analysis.security_hotspots',
        'analysis.code_smells',
        'analysis.complexity',
        'analysis.cognitive_complexity',
        'analysis.ncloc',
        'analysis.createdAt',
      ])
      .leftJoin('analysis.teamProject', 'project')
      .addSelect(['project.id', 'project.teamName', 'project.JenkinsJobName'])
      .leftJoin('project.users', 'user')
      .addSelect(['user.username'])
      .orderBy('analysis.createdAt', 'DESC')
      .getRawAndEntities();

    return history.entities.map((analysis) => {
      const project = analysis.teamProject as TeamProject & {
        latestAnalysis?: CodeAnalysis;
      };
      // DTO 매핑을 위해 project 객체에 latestAnalysis 속성 추가
      project.latestAnalysis = analysis;

      return new TeamProjectResponseDto(project);
    });
  }

  async getTeamDataWithAstData(projectId: number): Promise<TeamProject | null> {
    return await this.teamProjectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.users', 'user') // 팀원 정보 포함
      .leftJoinAndMapOne(
        'project.latestAnalysis', // DTO에서 참조할 가상 프로퍼티
        'CodeAnalysis',
        'analysis',
        'analysis.teamProjectId = project.id AND analysis.id = (SELECT MAX(ca.id) FROM code_analysis ca WHERE ca.teamProjectId = project.id)',
      )
      .where('project.id = :id', { id: projectId })
      .getOne();
  }

  /**
   * "내 프로젝트" 목록 — 로그인 사용자가 속한 모든 TeamProject를 코드/요구사항 여부와 무관하게
   * 한 목록으로 반환한다 (jej_20 Phase 3).
   */
  async getMyProjects(userId: number): Promise<TeamProjectResponseDto[]> {
    const projects = await this.teamProjectRepository
      .createQueryBuilder('project')
      .innerJoin('project.users', 'membership', 'membership.id = :userId', {
        userId,
      })
      .leftJoinAndSelect('project.users', 'user')
      .leftJoinAndMapOne(
        'project.latestAnalysis',
        'CodeAnalysis',
        'analysis',
        'analysis.teamProjectId = project.id AND analysis.id = (SELECT MAX(ca.id) FROM code_analysis ca WHERE ca.teamProjectId = project.id)',
      )
      // sortOrder를 한 번이라도 지정한 프로젝트가 먼저, 그 안에서는 sortOrder 오름차순 —
      // 아직 순서를 바꾼 적 없는(sortOrder=null) 프로젝트는 기존처럼 updatedAt 최신순 (jej_22 Phase 2).
      .orderBy('project.sortOrder IS NULL', 'ASC')
      .addOrderBy('project.sortOrder', 'ASC')
      .addOrderBy('project.updatedAt', 'DESC')
      .getMany();

    const requirementsCounts =
      await this.requirementsService.countByTeamProjectIds(
        projects.map((project) => project.id),
      );

    return projects.map(
      (project) =>
        new TeamProjectResponseDto(
          project,
          requirementsCounts.get(project.id) ?? 0,
        ),
    );
  }

  /**
   * "내 프로젝트" 카드 순서 저장 (jej_22 Phase 2). orderedIds에 포함된 모든 id가 userId의
   * 프로젝트인지 먼저 전부 검증한 뒤 갱신한다(하나라도 남의 프로젝트면 아무 것도 바꾸지 않음).
   * save()가 아닌 부분 업데이트(update)를 써서 updatedAt이 갱신되지 않게 한다 — 순서 변경은
   * "마지막 수정일"에 영향을 주지 않는다는 spec 1장 결정.
   */
  async updateMyProjectsOrder(
    userId: number,
    orderedIds: number[],
  ): Promise<void> {
    if (orderedIds.length === 0) return;

    const owned = await this.teamProjectRepository
      .createQueryBuilder('project')
      .innerJoin('project.users', 'membership', 'membership.id = :userId', {
        userId,
      })
      .where('project.id IN (:...orderedIds)', { orderedIds })
      .getMany();

    if (owned.length !== orderedIds.length) {
      throw new ForbiddenException(
        '본인 프로젝트만 순서를 변경할 수 있습니다.',
      );
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        this.teamProjectRepository
          .createQueryBuilder()
          .update(TeamProject)
          .set({ sortOrder: index })
          .where('id = :id', { id })
          .execute(),
      ),
    );
  }

  /**
   * 프로젝트 상세 — 멤버십 검증은 ProjectMemberGuard(jej_22 인가 가드 통합,
   * team-project.controller.ts에 적용)가 컨트롤러 진입 시점에 이미 수행한다.
   */
  async getProjectDetail(
    teamProjectId: number,
  ): Promise<TeamProjectResponseDto> {
    const project = await this.getTeamDataWithAstData(teamProjectId);
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');

    const requirementsCounts =
      await this.requirementsService.countByTeamProjectIds([teamProjectId]);

    return new TeamProjectResponseDto(
      project,
      requirementsCounts.get(teamProjectId) ?? 0,
    );
  }

  /**
   * 프로젝트 삭제 (jej_22 Phase 1). 멤버십 검증은 getProjectDetail과 동일하게
   * ProjectMemberGuard가 컨트롤러 진입 시점에 이미 수행한다.
   * OneToMany 관계(codeAnalyses/astSnapshots/apiKeys/metricAnalysisJobs)가 전부
   * cascade: true라 remove()로 함께 정리된다.
   */
  async deleteProject(teamProjectId: number): Promise<void> {
    const project = await this.getTeamDataWithAstData(teamProjectId);
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');

    await this.teamProjectRepository.remove(project);
  }
}
