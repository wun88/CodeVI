import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyRequestDto {
  @ApiProperty({ description: 'API Key 식별용 이름', example: 'codex-local' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: '특정 프로젝트 전용 키로 제한할 경우의 프로젝트 ID',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  teamProjectId?: number;

  @ApiPropertyOptional({
    description: 'API Key 만료 시각',
    example: '2026-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
