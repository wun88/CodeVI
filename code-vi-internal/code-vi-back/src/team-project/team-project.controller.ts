import { Controller, Post, Body, Logger, HttpStatus, Get, Param, NotFoundException } from '@nestjs/common';
import { TeamProjectService } from './team-project.service';
import { CreateTeamProjectAnalysisDto } from './dto/create-team-project.dto';
import { ApiResponseDto } from '../common/api-response-dto/api-response.dto';
import { TeamProjectResponseDto } from './dto/team-project-response.dto';

@Controller('team-projects')
export class TeamProjectController {
    private readonly logger = new Logger(TeamProjectController.name);

    constructor(private readonly teamProjectService: TeamProjectService) { }

    @Post()
    async createJenkinsNotification(
        @Body() dto: CreateTeamProjectAnalysisDto
    ): Promise<ApiResponseDto<void>> {
        await this.teamProjectService.createJenkinsNotification(dto);
        return new ApiResponseDto(true, HttpStatus.CREATED, 'Jenkins Notification received successfully');
    }

    @Get('/history')
    async getBuildHistory(): Promise<ApiResponseDto<TeamProjectResponseDto[]>> {
        const history = await this.teamProjectService.getAllBuildHistory();
        return new ApiResponseDto(true, HttpStatus.OK, 'Build history found.', history);
    }
}