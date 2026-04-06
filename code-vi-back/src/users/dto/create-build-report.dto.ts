import { IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AstNodeInputDto } from '../../ast-relational/dto/create-relational-ast.dto';

export class JenkinsMetadataDto {
    @ApiProperty()
    @IsNumber()
    buildNumber: number;

    @ApiProperty()
    @IsString()
    jobName: string;

    @ApiProperty()
    @IsString()
    buildUrl: string;
}

export class CollaboratorDto {
    @ApiProperty()
    @IsNumber()
    githubUid: number;

    @ApiProperty()
    @IsString()
    login: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    avatarUrl?: string;
}

export class createBuildReportDto {
    @ApiProperty({ description: 'Jenkins Job Name to identify the project' })
    @IsString()
    @IsNotEmpty()
    jenkinsJobName: string;

    @ApiProperty({ type: JenkinsMetadataDto })
    @ValidateNested()
    @Type(() => JenkinsMetadataDto)
    jenkinsMetadata: JenkinsMetadataDto;

    @ApiProperty({ type: [CollaboratorDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CollaboratorDto)
    collaborators: CollaboratorDto[];

    @ApiProperty({ type: [AstNodeInputDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AstNodeInputDto)
    astNodes: AstNodeInputDto[];
}
