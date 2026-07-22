import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
