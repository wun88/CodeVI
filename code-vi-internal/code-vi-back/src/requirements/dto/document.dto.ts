import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { DocumentType } from '../entities/document-type.enum';

export class GenerateDocumentDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.SRS })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  requirementIds: number[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeTraceability?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeNfr?: boolean;
}

export class UpdateDocumentSectionDto {
  @ApiProperty({ example: 'overview' })
  @IsString()
  sectionId: string;

  @ApiProperty()
  @IsString()
  content: string;
}

export class RegenerateSectionDto {
  @ApiProperty({ example: 'overview' })
  @IsString()
  sectionId: string;
}
