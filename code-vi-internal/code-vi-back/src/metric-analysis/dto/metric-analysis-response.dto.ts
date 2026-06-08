import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CKMetricsDto,
  ClassicMetricsDto,
  CodeSmellDto,
  OOMetricsDto,
} from '../../metric/dto/metric-result.dto';
import { MetricAnalysisStatus } from '../entities/metric-analysis-status.enum';
import { MetricAnalysisType } from '../entities/metric-analysis-type.enum';

export class MetricAnalysisSummaryDto {
  @ApiProperty({ example: 1 })
  classCount: number;

  @ApiProperty({ example: 0 })
  codeSmellCount: number;
}

export class MetricAnalysisResultDto {
  @ApiProperty({ type: MetricAnalysisSummaryDto })
  summary: MetricAnalysisSummaryDto;

  @ApiPropertyOptional({ type: ClassicMetricsDto, nullable: true })
  classic: ClassicMetricsDto | null;

  @ApiPropertyOptional({ type: [CKMetricsDto], nullable: true })
  ck: CKMetricsDto[] | null;

  @ApiPropertyOptional({ type: [OOMetricsDto], nullable: true })
  oo: OOMetricsDto[] | null;

  @ApiPropertyOptional({ type: [CodeSmellDto], nullable: true })
  smells: CodeSmellDto[] | null;
}

export class MetricAnalysisExecutionResponseDto {
  @ApiProperty({ example: 101 })
  jobId: number;

  @ApiProperty({ enum: MetricAnalysisStatus, example: MetricAnalysisStatus.SUCCESS })
  status: MetricAnalysisStatus;

  @ApiProperty({ example: 3 })
  teamProjectId: number;

  @ApiProperty({ enum: MetricAnalysisType, example: MetricAnalysisType.FULL })
  analysisType: MetricAnalysisType;

  @ApiProperty({ type: MetricAnalysisResultDto })
  result: MetricAnalysisResultDto;
}

export class MetricAnalysisListItemDto {
  @ApiProperty({ example: 101 })
  jobId: number;

  @ApiProperty({ enum: MetricAnalysisStatus, example: MetricAnalysisStatus.SUCCESS })
  status: MetricAnalysisStatus;

  @ApiProperty({ example: 3 })
  teamProjectId: number;

  @ApiProperty({ enum: MetricAnalysisType, example: MetricAnalysisType.FULL })
  analysisType: MetricAnalysisType;

  @ApiPropertyOptional({ example: 'src/services/report.service.ts', nullable: true })
  filePath: string | null;

  @ApiProperty({ example: '2026-06-04T12:00:00.000Z' })
  requestedAt: Date;

  @ApiPropertyOptional({ example: '2026-06-04T12:00:01.000Z', nullable: true })
  completedAt: Date | null;
}

export class MetricAnalysisDetailDto extends MetricAnalysisListItemDto {
  @ApiPropertyOptional({ example: 'parser timeout', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ type: MetricAnalysisResultDto })
  result: MetricAnalysisResultDto;
}
