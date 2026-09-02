import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AstRelationalService } from './ast-relational.service';
import { CreateRelationalAstDto } from './dto/create-relational-ast.dto';
import { AiRefactoringSuggestDto } from './dto/ai-refactoring-suggest.dto';
import { ProjectMember } from '../auth/custom-guards-decorators/project-member.decorator';
import { ProjectMemberGuard } from '../auth/custom-guards-decorators/project-member.guard';

@ApiTags('AST Data (Relational)')
@Controller('ast-data/relational')
export class AstRelationalController {
  constructor(private readonly astRelationalService: AstRelationalService) {}

  @Post()
  @ApiOperation({
    summary: 'AST 데이터를 정규화하여 저장 (Directory→File→Class→Function)',
  })
  @ApiResponse({ status: 201, description: 'AST 스냅샷이 정규화되어 저장됨' })
  async saveAstData(@Body() dto: CreateRelationalAstDto) {
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();
    const result = await this.astRelationalService.saveAstData(dto);
    const serverSaveMs = +(performance.now() - start).toFixed(4);
    const diff = process.memoryUsage().heapUsed - startMem;
    const serverMemoryBytes = Math.max(0, diff);
    return Object.assign(result, { serverSaveMs, serverMemoryBytes });
  }

  @Get()
  @ApiOperation({ summary: '전체 AST 스냅샷 조회 (관계형)' })
  async getAllSnapshots() {
    return await this.astRelationalService.getAllSnapshots();
  }

  // 프로젝트 하나의 스냅샷 요약 목록 — ProjectDetail "코드 품질" 탭용 (jej_23 Phase 12 후속).
  // getAllSnapshots()와 달리 teamProjectId로 스코프하고 멤버십 검증도 한다.
  @Get('project/:teamProjectId')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  @ApiOperation({ summary: '프로젝트 하나의 AST 스냅샷 요약 목록' })
  async getSnapshotSummariesForProject(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ) {
    return await this.astRelationalService.getSnapshotSummariesForProject(
      teamProjectId,
    );
  }

  @Get(':snapshotId')
  @ApiOperation({ summary: '특정 AST 스냅샷 조회' })
  async getSnapshot(@Param('snapshotId', ParseIntPipe) snapshotId: number) {
    return await this.astRelationalService.getSnapshotById(snapshotId);
  }

  // "리팩토링 인사이트" 섹션에서 화면에 표시 중인 후보 클래스에 대해 AI(NVIDIA) 개선 제안을 생성한다.
  @Post('project/:teamProjectId/refactoring/ai-suggest')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  @ApiOperation({
    summary: 'CK 메트릭 이상 클래스에 대한 AI 리팩토링 제안 생성',
  })
  async generateAiRefactoringSuggestions(
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
    @Body() dto: AiRefactoringSuggestDto,
  ) {
    return await this.astRelationalService.generateAiRefactoringSuggestions(
      teamProjectId,
      dto,
    );
  }

  // DEAD CODE (2026-07-11): 아래 benchmark 3종 엔드포인트는 성능 실험용으로,
  // 프론트·Jenkins·MCP 어디에서도 호출하지 않음.
  @Get('benchmark/natural-join/:snapshotId')
  @ApiOperation({ summary: '벤치마크: Natural JOIN 방식으로 AST 스냅샷 조회' })
  async benchmarkNaturalJoin(
    @Param('snapshotId', ParseIntPipe) snapshotId: number,
  ) {
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();
    const data =
      await this.astRelationalService.getSnapshotByNaturalJoin(snapshotId);
    const serverQueryMs = +(performance.now() - start).toFixed(4);
    const diff = process.memoryUsage().heapUsed - startMem;
    const serverMemoryBytes = Math.max(0, diff);
    return { method: 'natural-join', serverQueryMs, serverMemoryBytes, data };
  }

  @Get('benchmark/nested/:snapshotId')
  @ApiOperation({ summary: '벤치마크: Nested SQL 방식으로 AST 스냅샷 조회' })
  async benchmarkNested(@Param('snapshotId', ParseIntPipe) snapshotId: number) {
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();
    const data =
      await this.astRelationalService.getSnapshotByNested(snapshotId);
    const serverQueryMs = +(performance.now() - start).toFixed(4);
    const diff = process.memoryUsage().heapUsed - startMem;
    const serverMemoryBytes = Math.max(0, diff);
    return { method: 'nested', serverQueryMs, serverMemoryBytes, data };
  }

  @Get('benchmark/whole-json/:snapshotId')
  @ApiOperation({ summary: '벤치마크: Whole JSON 방식으로 AST 스냅샷 조회' })
  async benchmarkWholeJson(
    @Param('snapshotId', ParseIntPipe) snapshotId: number,
  ) {
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();
    const data =
      await this.astRelationalService.getSnapshotByWholeJson(snapshotId);
    const serverQueryMs = +(performance.now() - start).toFixed(4);
    const diff = process.memoryUsage().heapUsed - startMem;
    const serverMemoryBytes = Math.max(0, diff);
    return { method: 'whole-json', serverQueryMs, serverMemoryBytes, data };
  }
}
