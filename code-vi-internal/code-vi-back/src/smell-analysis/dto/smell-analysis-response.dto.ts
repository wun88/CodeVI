import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SmellAnalysisStatus } from '../entities/smell-analysis-status.enum';

// ---------------------------------------------------------------------------
// Sub-DTOs
// ---------------------------------------------------------------------------

export class SmellSummaryDto {
  @ApiProperty({ example: 43 })
  total: number;

  @ApiProperty({ example: { high: 11, medium: 32 } })
  bySeverity: Record<string, number>;

  @ApiProperty({ example: { long_method: 41, data_clumps: 2 } })
  byName: Record<string, number>;
}

export class SmellAnalysisResponseMetaDto {
  @ApiProperty({ example: false })
  summaryOnly: boolean;

  @ApiProperty({ example: 43 })
  returnedTotal: number;

  @ApiProperty({ example: false })
  truncated: boolean;

  @ApiPropertyOptional({ example: 20 })
  limitPerGroup?: number;
}

export class SmellAnalysisFindingItemDto {
  @ApiProperty({ example: 100 })
  id: number;

  @ApiProperty({ example: 'long_method' })
  name: string;

  @ApiPropertyOptional({ example: 'size_metric', nullable: true })
  category: string | null;

  @ApiProperty({ example: 'high' })
  severity: string;

  @ApiPropertyOptional({ example: 'src/user_service.py', nullable: true })
  filePath: string | null;

  @ApiPropertyOptional({ example: 10, nullable: true })
  lineStart: number | null;

  @ApiPropertyOptional({ example: 70, nullable: true })
  lineEnd: number | null;

  @ApiPropertyOptional({ example: 'UserService.getUser', nullable: true })
  entity: string | null;

  @ApiPropertyOptional({ example: 'Extract Method', nullable: true })
  message: string | null;

  @ApiPropertyOptional({ example: { loc: 61, threshold: 50 }, nullable: true })
  metrics: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// 실행 응답 (POST /smell-analyses)
// ---------------------------------------------------------------------------

export class SmellAnalysisExecutionResponseDto {
  @ApiProperty({ example: 10 })
  jobId: number;

  @ApiProperty({ enum: SmellAnalysisStatus, example: SmellAnalysisStatus.SUCCESS })
  status: SmellAnalysisStatus;

  @ApiProperty({ example: 1 })
  teamProjectId: number;

  @ApiProperty({ example: 'python' })
  language: string;

  @ApiProperty({ example: 'advanced_pyexamine' })
  analyzer: string;

  @ApiProperty({ type: SmellSummaryDto })
  summary: SmellSummaryDto;

  @ApiProperty({ type: SmellAnalysisResponseMetaDto })
  response: SmellAnalysisResponseMetaDto;
}

// ---------------------------------------------------------------------------
// 목록 조회 아이템 (GET /smell-analyses)
// ---------------------------------------------------------------------------

export class SmellAnalysisListItemDto {
  @ApiProperty({ example: 10 })
  jobId: number;

  @ApiProperty({ enum: SmellAnalysisStatus, example: SmellAnalysisStatus.SUCCESS })
  status: SmellAnalysisStatus;

  @ApiProperty({ example: 1 })
  teamProjectId: number;

  @ApiPropertyOptional({ example: 55, nullable: true })
  codeAnalysisId: number | null;

  @ApiPropertyOptional({ example: 102, nullable: true })
  buildNumber: number | null;

  @ApiPropertyOptional({ example: 'd42f609c6f6e121eb6667449cc19d97401b0dcfb', nullable: true })
  commitHash: string | null;

  @ApiProperty({ example: 'python' })
  language: string;

  @ApiProperty({ example: 'advanced_pyexamine' })
  analyzer: string;

  @ApiProperty({ example: 43 })
  summaryTotal: number;

  @ApiProperty({ example: { high: 11, medium: 32 } })
  summaryBySeverity: Record<string, number>;

  @ApiProperty({ example: '2026-07-03T10:00:00.000Z' })
  requestedAt: Date;

  @ApiPropertyOptional({ example: '2026-07-03T10:00:12.000Z', nullable: true })
  completedAt: Date | null;
}

// ---------------------------------------------------------------------------
// 단건 상세 응답 (GET /smell-analyses/:id)
// ---------------------------------------------------------------------------

export class SmellAnalysisDetailDto extends SmellAnalysisListItemDto {
  @ApiProperty({ type: SmellSummaryDto })
  summary: SmellSummaryDto;

  @ApiProperty({ type: [SmellAnalysisFindingItemDto] })
  findings: SmellAnalysisFindingItemDto[];

  @ApiPropertyOptional({ example: null, nullable: true })
  errorMessage: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  errorCode: string | null;
}

// ---------------------------------------------------------------------------
// Finding 필터 조회 응답 (GET /smell-analyses/:id/findings)
// ---------------------------------------------------------------------------

export class SmellAnalysisFindingsResponseDto {
  @ApiProperty({ type: [SmellAnalysisFindingItemDto] })
  items: SmellAnalysisFindingItemDto[];

  @ApiProperty({ example: 41 })
  total: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}
