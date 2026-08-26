import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

/** "내 프로젝트" 카드 순서 저장 (jej_22 Phase 2) — 화면에 보이는 카드 전체의 id를 원하는 순서대로 담는다. */
export class UpdateTeamProjectsOrderDto {
  @ApiProperty({ type: [Number], example: [3, 1, 2] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  orderedIds: number[];
}
