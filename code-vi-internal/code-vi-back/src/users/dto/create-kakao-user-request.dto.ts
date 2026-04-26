import { IsString, IsEmail, IsNotEmpty, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { UserRole } from '../entities/user-role.enum';

export class CreateKakaoUserRequestDto {
  @IsNumber()
  @IsNotEmpty()
  kakaoUid: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  role: UserRole;
}
