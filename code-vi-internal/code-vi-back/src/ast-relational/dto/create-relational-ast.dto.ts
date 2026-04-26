import { IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AstNodeRangeDto {
  @ApiProperty() @IsNumber() line: number;
  @ApiProperty() @IsNumber() col: number;
}

export class AstRangeDto {
  @ApiProperty({ type: AstNodeRangeDto })
  @ValidateNested()
  @Type(() => AstNodeRangeDto)
  start: AstNodeRangeDto;

  @ApiProperty({ type: AstNodeRangeDto })
  @ValidateNested()
  @Type(() => AstNodeRangeDto)
  end: AstNodeRangeDto;
}

export class AstNodeInputDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  // ✨ 새로 추가: 경로 정보
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNamed?: boolean;

  @ApiPropertyOptional({ type: AstRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AstRangeDto)
  range?: AstRangeDto;

  // ✨ 새로 추가: File 노드 내부의 AST 트리를 담는 래퍼 객체
  @ApiPropertyOptional({ type: () => AstNodeInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AstNodeInputDto)
  ast?: AstNodeInputDto;

  @ApiPropertyOptional({ type: () => [AstNodeInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AstNodeInputDto)
  children?: AstNodeInputDto[];
}

export class CreateRelationalAstDto {
  @ApiProperty({ description: 'Jenkins Job Name to identify the project' })
  @IsString()
  @IsNotEmpty()
  jenkinsJobName: string;

  @ApiProperty({ type: [AstNodeInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AstNodeInputDto)
  nodes: AstNodeInputDto[];
}