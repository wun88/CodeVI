import { IsString, IsEmail, IsNotEmpty, IsEnum, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { UserRole } from '../entities/user-role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../entities/user-status.enum';
import { CreateTeamProjectAnalysisDto } from 'src/team-project/dto/create-team-project.dto';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  githubUid?: number;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passwordConfirm?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class CreateUserWithAstAndBuildDto {
  @ApiProperty({ description: 'Can be a single username string or an array of username strings' })
  @IsNotEmpty()
  username: string | string[];

  @ApiProperty()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  passwordConfirm?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateTeamProjectAnalysisDto)
  ProjectDto: CreateTeamProjectAnalysisDto;
}