import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterProjectRequestDto {
  @IsString()
  @IsNotEmpty()
  owner: string;

  @IsString()
  @IsNotEmpty()
  repo: string;

  @IsOptional()
  @IsString()
  teamName?: string;

  /** 값이 있으면 신규 생성 대신 이 기존 프로젝트에 코드를 연결한다 (jej_20 Phase 5) */
  @IsOptional()
  @IsInt()
  teamProjectId?: number;
}
