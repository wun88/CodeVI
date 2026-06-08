import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { MetricAnalysisStatus } from '../entities/metric-analysis-status.enum';
import { MetricAnalysisType } from '../entities/metric-analysis-type.enum';

export class QueryMetricAnalysisRequestDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamProjectId?: number;

  @ApiPropertyOptional({ enum: MetricAnalysisType, example: MetricAnalysisType.FULL })
  @IsOptional()
  @IsEnum(MetricAnalysisType)
  analysisType?: MetricAnalysisType;

  @ApiPropertyOptional({ enum: MetricAnalysisStatus, example: MetricAnalysisStatus.SUCCESS })
  @IsOptional()
  @IsEnum(MetricAnalysisStatus)
  status?: MetricAnalysisStatus;
}
