import { IsString, IsNotEmpty, IsIn, MinLength } from 'class-validator';

export class PartialAnalysisDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(50, { message: 'Code must be at least 50 characters long.' })
  code: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['typescript', 'javascript', 'python', 'c', 'java'])
  language: string;
}
