import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateRequirementDto } from './create-requirement.dto';
import { RequirementStatus } from '../entities/requirement-status.enum';

/** teamProjectId는 리소스 경로(:id)로 이미 확정되므로 수정 대상에서 제외한다. */
export class UpdateRequirementDto extends PartialType(
  OmitType(CreateRequirementDto, ['teamProjectId'] as const),
) {
  @ApiPropertyOptional({
    enum: RequirementStatus,
    example: RequirementStatus.IN_REVIEW,
  })
  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  // 승인(approved) 상태에서만 지정 가능 — 서비스에서 검증한다 (jej_23 Phase 8).
  @ApiPropertyOptional({ example: 'v1.0-release' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  baseline?: string;
}
