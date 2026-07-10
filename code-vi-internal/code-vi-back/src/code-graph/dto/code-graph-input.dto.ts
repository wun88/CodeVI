import { IsArray, IsOptional, IsString } from 'class-validator';

/** 어댑터(examine)가 보내는 언어 무관 캐노니컬 코드그래프 입력. */
export class CodeUnitInputDto {
  @IsString() id: string; // 캐노니컬 unitKey
  @IsString() kind: string;
  @IsString() language: string;
  @IsString() name: string;
  @IsOptional() @IsString() qualname?: string;
  @IsOptional() @IsString() file?: string;
  @IsOptional() @IsString() parentId?: string | null;
  @IsOptional() range?: Record<string, number> | null;
  @IsOptional() attributes?: Record<string, any> | null;
  @IsOptional() metrics?: Record<string, any> | null;
  @IsOptional() metadata?: Record<string, any> | null;
}

export class CodeRelationInputDto {
  @IsString() kind: string;
  @IsString() sourceId: string;
  @IsString() targetId: string;
}

export class FindingInputDto {
  @IsString() detector: string;
  @IsString() category: string;
  @IsOptional() @IsString() entityId?: string;
  @IsOptional() location?: { file?: string; line?: number };
  @IsOptional() @IsString() severity?: string;
  @IsOptional() metrics?: Record<string, any>;
  @IsOptional() @IsString() message?: string | null;
  @IsOptional() backend?: { language?: string; parser?: string; version?: string };
}

export class CodeGraphInputDto {
  @IsOptional() @IsString() language?: string;

  @IsArray()
  units: CodeUnitInputDto[];

  @IsOptional() @IsArray()
  relations?: CodeRelationInputDto[];

  @IsOptional() @IsArray()
  findings?: FindingInputDto[];
}
