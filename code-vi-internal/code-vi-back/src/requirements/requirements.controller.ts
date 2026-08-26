import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import {
  BulkCreateRequirementDto,
  BulkCreateRequirementResultDto,
} from './dto/bulk-create-requirement.dto';
import { QueryRequirementDto } from './dto/query-requirement.dto';
import type { RequirementsSummaryDto } from './dto/requirements-summary.dto';
import type {
  MappingRecomputeResultDto,
  MappingSummaryDto,
} from './dto/mapping-summary.dto';
import { CreateDependencyDto } from './dto/dependency.dto';
import type { DependencyListDto } from './dto/dependency.dto';
import type { ImpactAnalysisDto } from './dto/impact.dto';
import {
  GenerateDocumentDto,
  RegenerateSectionDto,
  UpdateDocumentSectionDto,
} from './dto/document.dto';
import type { DocumentQualityCheck } from './lib/document-generator';
import type {
  BuildDetailDto,
  BuildHistoryItemDto,
  ScoreSnapshotDto,
} from './dto/build-history.dto';
import type { BaselineSummaryItemDto } from './dto/baseline-summary.dto';
import type { RecentActivityItemDto } from './dto/activity.dto';
import type { MatchDetailItemDto } from './dto/match-detail.dto';
import { Requirement } from './entities/requirement.entity';
import { AnalysisFinding } from './entities/analysis-finding.entity';
import { RequirementVersion } from './entities/requirement-version.entity';
import { RequirementDependency } from './entities/requirement-dependency.entity';
import { GeneratedDocument } from './entities/generated-document.entity';
import { ProjectMember } from '../auth/custom-guards-decorators/project-member.decorator';
import { ProjectMemberGuard } from '../auth/custom-guards-decorators/project-member.guard';
import { GetUser } from '../auth/custom-guards-decorators/get-user.decorator';
import { RequirementOwnerGuard } from './guards/requirement-owner.guard';
import { CodeMappingService } from './code-mapping.service';
import { RequirementDependencyService } from './requirement-dependency.service';
import { DocumentsService } from './documents.service';
import { BuildHistoryService } from './build-history.service';
import { User } from '../users/entities/user.entity';

// 요구사항 CRUD ("새 프로젝트 시작하기" — 요구사항 우선 플로우, jej_20 Phase 2)
// 프로젝트 멤버십 검증은 ProjectMemberGuard(jej_22 인가 가드 통합)가 담당한다 — 서비스는
// 대상 프로젝트가 이미 유효하다고 가정하고 데이터만 다룬다.
@ApiTags('Requirements')
@ApiBearerAuth()
@Controller('requirements')
export class RequirementsController {
  constructor(
    private readonly requirementsService: RequirementsService,
    private readonly codeMappingService: CodeMappingService,
    private readonly dependencyService: RequirementDependencyService,
    private readonly documentsService: DocumentsService,
    private readonly buildHistoryService: BuildHistoryService,
  ) {}

  @Post()
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'body', field: 'teamProjectId' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRequirementDto): Promise<Requirement> {
    return this.requirementsService.create(dto);
  }

  // CSV 가져오기/AI 생성 결과 일괄 등록 (PR #61 리뷰 #6) — 트랜잭션 1회, 전부 성공하거나 전부 롤백
  @Post('/bulk')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'body', field: 'teamProjectId' })
  @HttpCode(HttpStatus.CREATED)
  async createBulk(
    @Body() dto: BulkCreateRequirementDto,
  ): Promise<BulkCreateRequirementResultDto> {
    return this.requirementsService.createBulk(dto);
  }

  @Get()
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'query', field: 'teamProjectId' })
  async findAll(@Query() query: QueryRequirementDto): Promise<Requirement[]> {
    return this.requirementsService.findByTeamProject(query.teamProjectId);
  }

  // "요구사항 대시보드" 집계 — 개수/우선순위 분포/마감 알림/AI 분석 요약 (jej_20 Phase 6)
  @Get(':teamProjectId/summary')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getSummary(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<RequirementsSummaryDto> {
    return this.requirementsService.getSummary(teamProjectId);
  }

  // 중복/충돌/누락 후보 재계산("AI 분석 실행" 버튼) — 코드/Jenkins 무관 (jej_20 Phase 6)
  @Post(':teamProjectId/analysis/recompute')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async recomputeAnalysis(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<AnalysisFinding[]> {
    return this.requirementsService.recomputeFindings(teamProjectId);
  }

  // 요구사항-코드 매핑 요약(implementationScore/상태) — "재검증" 버튼 없이도 최근 계산 결과를
  // 바로 보여주기 위한 조회 전용 엔드포인트 (jej_23 Phase 7)
  @Get(':teamProjectId/mapping-summary')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getMappingSummary(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<MappingSummaryDto> {
    return this.codeMappingService.getMappingSummary(teamProjectId);
  }

  // 요구사항-코드 매핑 재계산("재검증" 버튼) — AST 저장 직후 자동 실행되기도 하지만
  // (ast-relational.service.ts), 수동으로도 다시 돌릴 수 있게 노출한다 (jej_23 Phase 7)
  @Post(':teamProjectId/mapping/recompute')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async recomputeMapping(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<MappingRecomputeResultDto> {
    return this.codeMappingService.recomputeForTeamProject(teamProjectId);
  }

  // 요구사항 수정/삭제 (PR #61 리뷰 #5) — teamProjectId가 라우트에 없고 요구사항 자신의 id를 통해서만
  // 알 수 있어, ProjectMemberGuard 대신 요구사항→프로젝트 순서로 조회하는 RequirementOwnerGuard를 쓴다.
  @Patch(':id')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequirementDto,
    @GetUser() user: User,
  ): Promise<Requirement> {
    return this.requirementsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.requirementsService.remove(id);
  }

  // 요구사항 변경 이력(콘텐츠 스냅샷) 조회, 최신순 (jej_23 Phase 8)
  @Get(':id/versions')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  async getVersions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RequirementVersion[]> {
    return this.requirementsService.getVersions(id);
  }

  // 의존관계 조회(나가는/들어오는) — depends_on/related/conflicts_with/duplicates (jej_23 Phase 8)
  @Get(':id/dependencies')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  async getDependencies(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DependencyListDto> {
    return this.dependencyService.findByRequirement(id);
  }

  // 의존관계 추가 — depends_on 타입은 순환 참조(A depends_on B depends_on A)를 서버에서 차단한다.
  @Post(':id/dependencies')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  @HttpCode(HttpStatus.CREATED)
  async addDependency(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDependencyDto,
  ): Promise<RequirementDependency> {
    return this.dependencyService.create(id, dto);
  }

  @Delete(':id/dependencies/:dependencyId')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDependency(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependencyId', ParseIntPipe) dependencyId: number,
  ): Promise<void> {
    await this.dependencyService.remove(id, dependencyId);
  }

  // 영향분석 — 연결된 코드/문서/빌드/테스트(Phase 5/7) + 의존관계(Phase 8) 종합 조회 (jej_23 Phase 8)
  @Get(':id/impact')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  async getImpact(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ImpactAnalysisDto> {
    return this.dependencyService.getImpact(id);
  }

  // 매칭된 코드 요소(파일/클래스/함수) top-5를 이름·경로·점수와 함께 조회 (jej_23 Phase 7 후속)
  @Get(':id/mapping-detail')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  async getMappingDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MatchDetailItemDto[]> {
    return this.codeMappingService.getMatchDetail(id);
  }

  // 문서(SRS/PRD/BRS) 목록 조회 — "문서" 탭 (jej_23 Phase 9, 탭 아키텍처 §1.2)
  @Get(':teamProjectId/documents')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async listDocuments(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<GeneratedDocument[]> {
    return this.documentsService.findByTeamProject(teamProjectId);
  }

  // 문서 생성 — 선택된 요구사항을 고정 섹션 구조(SRS 10개 등)에 템플릿으로 채운다(AI 아님)
  @Post(':teamProjectId/documents/generate')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  @HttpCode(HttpStatus.CREATED)
  async generateDocument(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
    @Body() dto: GenerateDocumentDto,
  ): Promise<GeneratedDocument> {
    return this.documentsService.generate(teamProjectId, dto);
  }

  // 섹션 직접 편집
  @Patch(':teamProjectId/documents/:documentId')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async updateDocumentSection(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: UpdateDocumentSectionDto,
  ): Promise<GeneratedDocument> {
    return this.documentsService.updateSection(
      teamProjectId,
      documentId,
      dto.sectionId,
      dto.content,
    );
  }

  // 섹션 템플릿 재생성 — 현재 요구사항 데이터로 해당 섹션만 다시 계산한다(§4 근거, "AI 재생성" 아님)
  @Post(':teamProjectId/documents/:documentId/regenerate-section')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async regenerateDocumentSection(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: RegenerateSectionDto,
  ): Promise<GeneratedDocument> {
    return this.documentsService.regenerateSection(
      teamProjectId,
      documentId,
      dto.sectionId,
    );
  }

  // 문서 품질 체크(누락 섹션/추적성 포함 비율)
  @Get(':teamProjectId/documents/:documentId/quality')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getDocumentQuality(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ): Promise<DocumentQualityCheck> {
    return this.documentsService.getQualityCheck(teamProjectId, documentId);
  }

  // 빌드 이력 — 실제 Jenkins 빌드(CodeAnalysis)와 재계산 시점 스코어 스냅샷을 연결해 반환 (jej_23 Phase 10)
  @Get(':teamProjectId/build-history')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getBuildHistory(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<BuildHistoryItemDto[]> {
    return this.buildHistoryService.getBuildHistory(teamProjectId);
  }

  // 빌드 상세 — 커밋/상태 + 해당 빌드에서 점수가 바뀐 요구사항 목록
  @Get(':teamProjectId/build-history/:buildNumber')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getBuildDetail(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
    @Param('buildNumber', ParseIntPipe) buildNumber: number,
  ): Promise<BuildDetailDto> {
    return this.buildHistoryService.getBuildDetail(teamProjectId, buildNumber);
  }

  // 요구사항별/프로젝트 전체 스코어 타임라인 — requirementId 쿼리로 필터링 가능
  @Get(':teamProjectId/score-timeline')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getScoreTimeline(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
    @Query('requirementId') requirementId?: string,
  ): Promise<ScoreSnapshotDto[]> {
    return this.buildHistoryService.getScoreTimeline(
      teamProjectId,
      requirementId ? Number(requirementId) : undefined,
    );
  }

  // 베이스라인별 요구사항 개수 — "설정" 탭 (jej_23 Phase 11)
  @Get(':teamProjectId/baselines')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getBaselines(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<BaselineSummaryItemDto[]> {
    return this.requirementsService.getBaselineSummary(teamProjectId);
  }

  // 최근 활동 피드 — RequirementVersion 생성 시점 재사용, 별도 activity 테이블 없음 (jej_23 Phase 12)
  @Get(':teamProjectId/activity')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getRecentActivity(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<RecentActivityItemDto[]> {
    return this.requirementsService.getRecentActivity(teamProjectId);
  }

  // 전체 findings 조회 — AI 인사이트 카드 "전체 보기" 토글용 (jej_23 Phase 12)
  @Get(':teamProjectId/analysis/findings')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  async getAllFindings(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ): Promise<AnalysisFinding[]> {
    return this.requirementsService.getAllFindings(teamProjectId);
  }
}
