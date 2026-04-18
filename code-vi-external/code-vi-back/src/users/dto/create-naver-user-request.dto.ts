import { IsString, IsEmail, IsNotEmpty, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user-role.enum';

export class CreateNaverUserRequestDto {
    @IsString()
    @IsNotEmpty()
    naverUid: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsEnum(UserRole)
    role: UserRole;
}