import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SmellAnalysisRequestOptionsDto {
  @ApiPropertyOptional({
    description: 'comma-separated detector names. ex) "long_method,data_clumps"',
    example: 'long_method,data_clumps',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  only?: string;

  @ApiPropertyOptional({
    description: 'true이면 smellGroups 생략, summary만 반환',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  summaryOnly?: boolean;

  @ApiPropertyOptional({
    description: '각 smell group에서 반환할 최대 항목 수',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  limitPerGroup?: number;
}

export class CreateSmellAnalysisRequestDto {
  @ApiProperty({ description: 'CodeVi team project ID', example: 1 })
  @IsInt()
  @IsPositive()
  teamProjectId: number;

  @ApiPropertyOptional({ description: 'code analysis job ID (연결 시)', example: 55 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  codeAnalysisId?: number;

  @ApiPropertyOptional({ description: 'metric-analysis job ID (연결 시)', example: 5 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  metricAnalysisJobId?: number;

  @ApiPropertyOptional({ description: 'Jenkins build number', example: 102 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  buildNumber?: number;

  @ApiPropertyOptional({ example: 'd42f609c6f6e121eb6667449cc19d97401b0dcfb' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  commitHash?: string;

  @ApiPropertyOptional({
    description: 'branch, tag, PR ref 등',
    example: 'main',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceRef?: string;

  @ApiProperty({ description: '분석 언어', example: 'python' })
  @IsString()
  @MaxLength(50)
  language: string;

  @ApiPropertyOptional({
    description: '분석 대상 Python project path (MCP/service에 전달)',
    example: '/opt/advanced-pyexamine-source/sample-project',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  projectPath?: string;

  @ApiProperty({ description: '분석 도구', example: 'advanced_pyexamine' })
  @IsString()
  @MaxLength(100)
  analyzer: string;

  @ApiPropertyOptional({ type: SmellAnalysisRequestOptionsDto })
  @IsOptional()
  @IsObject()
  @Type(() => SmellAnalysisRequestOptionsDto)
  options?: SmellAnalysisRequestOptionsDto;
}
