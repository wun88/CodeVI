import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, ValidateNested } from 'class-validator';
import { CreateRequirementDto } from './create-requirement.dto';

/** 배치 등록 시 개별 항목 — teamProjectId는 배치 전체에서 한 번만 지정한다. */
export class BulkCreateRequirementItemDto extends OmitType(
  CreateRequirementDto,
  ['teamProjectId'] as const,
) {}

/** CSV 가져오기/AI 생성 결과를 한 번의 트랜잭션으로 등록한다 (PR #61 리뷰 #6). */
export class BulkCreateRequirementDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  teamProjectId: number;

  @ApiProperty({ type: [BulkCreateRequirementItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateRequirementItemDto)
  items: BulkCreateRequirementItemDto[];
}

export class BulkCreateRequirementResultDto {
  successCount: number;
  failureCount: number;
  errors: string[];
}
