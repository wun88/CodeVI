import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyListItemDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: 'codex-local' })
  name: string;

  @ApiProperty({ example: 'cvk_ab12cd34' })
  prefix: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  expiresAt: Date | null;

  @ApiPropertyOptional({ example: '2026-06-04T15:30:00.000Z' })
  lastUsedAt: Date | null;

  @ApiPropertyOptional({ example: null })
  revokedAt: Date | null;

  @ApiPropertyOptional({ example: 3 })
  teamProjectId: number | null;
}

export class CreatedApiKeyDto extends ApiKeyListItemDto {
  @ApiProperty({ example: 'cv_live_0123456789abcdef' })
  apiKey: string;
}
