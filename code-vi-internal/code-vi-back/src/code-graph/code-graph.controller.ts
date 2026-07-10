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
