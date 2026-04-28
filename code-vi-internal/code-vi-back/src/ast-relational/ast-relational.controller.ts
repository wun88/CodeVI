import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AstRelationalService } from './ast-relational.service';
import { CreateRelationalAstDto } from './dto/create-relational-ast.dto';

@ApiTags('AST Data (Relational)')
@Controller('ast-data/relational')
export class AstRelationalController {
  constructor(private readonly astRelationalService: AstRelationalService) { }

  @Post()
  @ApiOperation({ summary: 'AST 데이터를 정규화하여 저장 (Directory→File→Class→Function)' })
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

  @Get(':snapshotId')
  @ApiOperation({ summary: '특정 AST 스냅샷 조회' })
  async getSnapshot(@Param('snapshotId', ParseIntPipe) snapshotId: number) {
    return await this.astRelationalService.getSnapshotById(snapshotId);
  }

  @Get('benchmark/natural-join/:snapshotId')
  @ApiOperation({ summary: '벤치마크: Natural JOIN 방식으로 AST 스냅샷 조회' })
  async benchmarkNaturalJoin(@Param('snapshotId', ParseIntPipe) snapshotId: number) {
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();
    const data = await this.astRelationalService.getSnapshotByNaturalJoin(snapshotId);
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
    const data = await this.astRelationalService.getSnapshotByNested(snapshotId);
    const serverQueryMs = +(performance.now() - start).toFixed(4);
    const diff = process.memoryUsage().heapUsed - startMem;
    const serverMemoryBytes = Math.max(0, diff);
    return { method: 'nested', serverQueryMs, serverMemoryBytes, data };
  }

  @Get('benchmark/whole-json/:snapshotId')
  @ApiOperation({ summary: '벤치마크: Whole JSON 방식으로 AST 스냅샷 조회' })
  async benchmarkWholeJson(@Param('snapshotId', ParseIntPipe) snapshotId: number) {
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();
    const data = await this.astRelationalService.getSnapshotByWholeJson(snapshotId);
    const serverQueryMs = +(performance.now() - start).toFixed(4);
    const diff = process.memoryUsage().heapUsed - startMem;
    const serverMemoryBytes = Math.max(0, diff);
    return { method: 'whole-json', serverQueryMs, serverMemoryBytes, data };
  }
}
