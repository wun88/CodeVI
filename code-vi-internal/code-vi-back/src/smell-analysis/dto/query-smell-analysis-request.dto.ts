import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SmellAnalysisStatus } from '../entities/smell-analysis-status.enum';

export class QuerySmellAnalysisRequestDto {
  @ApiPropertyOptional({ description: 'CodeVi team project ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamProjectId?: number;

  @ApiPropertyOptional({ description: '분석 언어 필터', example: 'python' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiPropertyOptional({ enum: SmellAnalysisStatus, example: SmellAnalysisStatus.SUCCESS })
  @IsOptional()
  @IsEnum(SmellAnalysisStatus)
  status?: SmellAnalysisStatus;

  @ApiPropertyOptional({ description: '분석 도구 필터', example: 'advanced_pyexamine' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  analyzer?: string;

  @ApiPropertyOptional({ description: 'Jenkins build number 필터', example: 102 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  buildNumber?: number;

  @ApiPropertyOptional({ description: 'commit hash 필터', example: 'd42f609c6f6e121eb6667449cc19d97401b0dcfb' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  commitHash?: string;

  @ApiPropertyOptional({ description: '페이지당 항목 수', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;

  @ApiPropertyOptional({ description: '조회 시작 offset', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class QuerySmellFindingsRequestDto {
  @ApiPropertyOptional({ description: 'severity 필터', example: 'high' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  severity?: string;

  @ApiPropertyOptional({ description: 'smell rule name 필터', example: 'long_method' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'analyzer category 필터', example: 'size_metric' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'file path prefix 필터', example: 'src/' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  filePath?: string;

  @ApiPropertyOptional({ description: '페이지당 항목 수', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;

  @ApiPropertyOptional({ description: '조회 시작 offset', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
