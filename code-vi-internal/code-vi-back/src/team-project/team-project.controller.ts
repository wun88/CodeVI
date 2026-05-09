import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { TeamProjectService } from './team-project.service';
import { CreateTeamProjectAnalysisDto } from './dto/create-team-project.dto';
import { TeamProjectResponseDto } from './dto/team-project-response.dto';

@Controller('team-projects')
export class TeamProjectController {
    private readonly logger = new Logger(TeamProjectController.name);

    constructor(private readonly teamProjectService: TeamProjectService) { }

    @Post()
    async createJenkinsNotification(
        @Body() dto: CreateTeamProjectAnalysisDto
    ): Promise<void> {
        return this.teamProjectService.createJenkinsNotification(dto);
    }

    @Get('/history')
    async getBuildHistory(): Promise<TeamProjectResponseDto[]> {
        return this.teamProjectService.getAllBuildHistory();
    }
}