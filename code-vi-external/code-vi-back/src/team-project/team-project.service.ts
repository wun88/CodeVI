import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { TeamProject } from './entities/team-project.entity';
import { CodeAnalysis } from '../code-analysis/entities/code-analysis.entity';
import { CreateTeamProjectAnalysisDto } from './dto/create-team-project.dto';
import { TeamProjectResponseDto } from './dto/team-project-response.dto';

@Injectable()
export class TeamProjectService {
  private readonly logger = new Logger(TeamProjectService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

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
      (err) => this.logger.error(`Enrichment Background Error: ${err.message}`),
    );

    return savedAnalysis; // Jenkins에게는 201 Created를 즉시 반환
  }

  private async fetchAndUpdateSonarMetrics(
    analysisId: number,
    projectKey: string,
  ) {
    const sonarToken = this.configService.get('SONAR_TOKEN');
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

    const measures = response.data.component.measures;
    const metricsUpdate = {};
    measures.forEach((m) => {
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

    return history.entities.map((analysis, index) => {
      const project = analysis.teamProject;
      // DTO 매핑을 위해 project 객체에 latestAnalysis 속성 추가
      (project as any).latestAnalysis = analysis;

      return new TeamProjectResponseDto(project);
    });
  }

  async getTeamDataWithAstData(
    projectId: number,
    astId: number,
  ): Promise<TeamProject | null> {
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
}
