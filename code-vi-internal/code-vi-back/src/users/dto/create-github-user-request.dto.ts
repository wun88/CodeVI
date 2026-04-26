import { IsString, IsEmail, IsNotEmpty, IsEnum, IsNumber } from 'class-validator';
import { UserRole } from '../entities/user-role.enum';

export class CreateGithubUserRequestDto {
  @IsNumber()
  @IsNotEmpty()
  githubUid: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;
}
