import { IsString, MaxLength, MinLength } from 'class-validator';

/** "새 프로젝트 시작하기"(요구사항 우선) — 코드/Jenkins 없이 프로젝트만 먼저 생성 (jej_20 Phase 1) */
export class CreateRequirementsOnlyProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  teamName: string;
}
