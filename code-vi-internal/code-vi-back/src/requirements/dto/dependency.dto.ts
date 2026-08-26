import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt } from 'class-validator';
import { DependencyType } from '../entities/dependency-type.enum';

export class CreateDependencyDto {
  @ApiProperty({ example: 12, description: '의존 대상 요구사항 id' })
  @IsInt()
  targetRequirementId: number;

  @ApiProperty({ enum: DependencyType, example: DependencyType.DEPENDS_ON })
  @IsEnum(DependencyType)
  type: DependencyType;
}

/** 의존관계 한 건 — 반대편 요구사항 관점에서 표시할 정보만 담는다 (jej_23 Phase 8). */
export interface DependencyItem {
  id: number;
  requirementId: number;
  title: string;
  type: DependencyType;
  createdAt: string;
}

/** `GET /api/requirements/:id/dependencies` 응답 */
export interface DependencyListDto {
  outgoing: DependencyItem[];
  incoming: DependencyItem[];
}
