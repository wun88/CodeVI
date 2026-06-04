import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MetricAnalysisType } from '../entities/metric-analysis-type.enum';
import { MetricSourceType } from '../entities/metric-source-type.enum';

export class CreateMetricAnalysisRequestDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  teamProjectId: number;

  @ApiProperty({ enum: MetricAnalysisType, example: MetricAnalysisType.FULL })
  @IsEnum(MetricAnalysisType)
  analysisType: MetricAnalysisType;

  @ApiProperty({ enum: MetricSourceType, example: MetricSourceType.AST_JSON })
  @IsEnum(MetricSourceType)
  sourceType: MetricSourceType;

  @ApiPropertyOptional({ example: 'src/services/report.service.ts' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  filePath?: string;

  @ApiPropertyOptional({ description: '메트릭 계산용 AST 데이터', type: Object })
  @IsOptional()
  @IsObject()
  astData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '사이즈 메트릭 정밀 보정용 원본 소스 코드' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sourceCode?: string;
}
