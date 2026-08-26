import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RequirementType } from '../entities/requirement-type.enum';
import { RequirementPriority } from '../entities/requirement-priority.enum';

export class CreateRequirementDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  teamProjectId: number;

  @ApiProperty({ example: '로그인 기능' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: '사용자가 이메일/비밀번호로 로그인할 수 있어야 한다.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: RequirementType, example: RequirementType.FUNCTIONAL })
  @IsEnum(RequirementType)
  type: RequirementType;

  @ApiPropertyOptional({
    enum: RequirementPriority,
    example: RequirementPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(RequirementPriority)
  priority?: RequirementPriority;

  @ApiPropertyOptional({
    description:
      '담당자 이름 — 회원이 아닌 프로젝트 참여 인원도 지정할 수 있도록 자유 문자열',
    example: '김재호',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerName?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: '회의록 2026-07-23' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: '인증' })
  @IsOptional()
  @IsString()
  relatedFeature?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptanceCriteria?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
