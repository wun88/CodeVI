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
import { Requirement } from './entities/requirement.entity';
import { AnalysisFinding } from './entities/analysis-finding.entity';
import { ProjectMember } from '../auth/custom-guards-decorators/project-member.decorator';
import { ProjectMemberGuard } from '../auth/custom-guards-decorators/project-member.guard';
import { RequirementOwnerGuard } from './guards/requirement-owner.guard';

// 요구사항 CRUD ("새 프로젝트 시작하기" — 요구사항 우선 플로우, jej_20 Phase 2)
// 프로젝트 멤버십 검증은 ProjectMemberGuard(jej_22 인가 가드 통합)가 담당한다 — 서비스는
// 대상 프로젝트가 이미 유효하다고 가정하고 데이터만 다룬다.
@ApiTags('Requirements')
@ApiBearerAuth()
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

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

  // 요구사항 수정/삭제 (PR #61 리뷰 #5) — teamProjectId가 라우트에 없고 요구사항 자신의 id를 통해서만
  // 알 수 있어, ProjectMemberGuard 대신 요구사항→프로젝트 순서로 조회하는 RequirementOwnerGuard를 쓴다.
  @Patch(':id')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequirementDto,
  ): Promise<Requirement> {
    return this.requirementsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard(), RequirementOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.requirementsService.remove(id);
  }
}
