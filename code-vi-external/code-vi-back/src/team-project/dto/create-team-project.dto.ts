import { IsObject, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCodeAnalysisDto } from '../../code-analysis/dto/create-code-analysis.dto';
import { AstNodeInputDto } from 'src/ast-relational/dto/create-relational-ast.dto';

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
}
