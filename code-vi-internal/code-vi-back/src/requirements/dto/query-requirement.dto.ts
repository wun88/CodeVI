import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class QueryRequirementDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  teamProjectId: number;
}
