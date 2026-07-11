// DEAD CODE (2026-07-11): 현재 호출자 없음 — 프론트·MCP 어디서도 GET /api/code-graph/:id 를
// 부르지 않고, code_graph 적재 파이프라인도 미가동이라 존재하는 스냅샷(4)에도 404 반환.
// (PR37 examine 통합에서 활성화 예정이면 이 주석 제거)
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CodeGraphService } from './code-graph.service';

@Controller('code-graph')
export class CodeGraphController {
  constructor(private readonly codeGraphService: CodeGraphService) {}

  /** 캐노니컬 코드그래프 + 메트릭 카탈로그 (언어 무관 단일 계약). */
  @Get(':snapshotId')
  async getGraph(@Param('snapshotId', ParseIntPipe) snapshotId: number) {
    return this.codeGraphService.getGraph(snapshotId);
  }
}
