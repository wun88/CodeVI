import { IsInt, IsOptional, IsString } from 'class-validator';
import { PyExamineResult } from '../interface/pyexamine.interface';

export class CreateCodeAnalysisDto {
  @IsString()
  jobName: string;

  @IsInt()
  buildNumber: number;

  @IsString()
  status: string;

  @IsString()
  buildUrl: string;

  @IsString()
  commitHash: string;

  @IsOptional()
  pyExamineResult: PyExamineResult[];
}
