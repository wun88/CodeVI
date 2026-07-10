import { IsObject, IsString, ValidateNested, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCodeAnalysisDto } from '../../code-analysis/dto/create-code-analysis.dto';
import { AstNodeInputDto } from 'src/ast-relational/dto/create-relational-ast.dto';
import { CodeGraphInputDto } from 'src/code-graph/dto/code-graph-input.dto';

/** pyexamine이 계산한 클래스별 CK/OO 메트릭 (AstClass.metrics로 매핑) */
export class ClassMetricInputDto {
  @IsOptional() @IsString() entity?: string;
  @IsString() file: string;
  @IsString() name: string;
  @IsObject() metrics: Record<string, number>;
}

export class CreateTeamProjectAnalysisDto {
  @IsString()
  teamName: string;

  @IsString()
  jenkinsJobName: string;

  @IsString()
  sonarProjectKey: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CreateCodeAnalysisDto)
  analysis: CreateCodeAnalysisDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AstNodeInputDto)
  astNodes?: AstNodeInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassMetricInputDto)
  classMetrics?: ClassMetricInputDto[];

  // 언어 무관 캐노니컬 코드그래프 (examine 어댑터 출력). 있으면 code_unit 등에 병행 적재.
  @IsOptional()
  @IsObject()
  codeGraph?: CodeGraphInputDto;
}
