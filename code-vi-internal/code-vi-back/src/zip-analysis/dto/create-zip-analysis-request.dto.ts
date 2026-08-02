import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateZipAnalysisRequestDto {
  @ApiPropertyOptional({
    description: 'Parser benchmark 저장 시 사용할 저장소 이름',
    example: 'sample-repository',
  })
  @IsOptional()
  @IsString()
  repoName?: string;

  @ApiPropertyOptional({
    description:
      'examine(/codegraph) 라우팅에 쓸 주 언어. 미지정 시 python. 미배포 언어면 examine 은 null.',
    enum: ['python', 'java', 'c', 'typescript'],
    example: 'python',
  })
  @IsOptional()
  @IsString()
  @IsIn(['python', 'java', 'c', 'typescript'])
  language?: string;
}
