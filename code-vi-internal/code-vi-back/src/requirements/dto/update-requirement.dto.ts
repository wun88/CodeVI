import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
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
}
