import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateZipAnalysisRequestDto {
  @ApiPropertyOptional({
    description: 'Parser benchmark 저장 시 사용할 저장소 이름',
    example: 'sample-repository',
  })
  @IsOptional()
  @IsString()
  repoName?: string;
}
