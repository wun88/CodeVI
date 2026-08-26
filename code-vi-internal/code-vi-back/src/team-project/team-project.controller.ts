import {
  Controller,
  Post,
  Body,
  Logger,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamProjectService } from './team-project.service';
import { CreateTeamProjectAnalysisDto } from './dto/create-team-project.dto';
import { CreateRequirementsOnlyProjectDto } from './dto/create-requirements-only-project.dto';
import { UpdateTeamProjectsOrderDto } from './dto/update-team-projects-order.dto';
import { TeamProjectResponseDto } from './dto/team-project-response.dto';
import { GetUser } from '../auth/custom-guards-decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ProjectMember } from '../auth/custom-guards-decorators/project-member.decorator';
import { ProjectMemberGuard } from '../auth/custom-guards-decorators/project-member.guard';

@Controller('team-projects')
export class TeamProjectController {
  private readonly logger = new Logger(TeamProjectController.name);

  constructor(private readonly teamProjectService: TeamProjectService) {}

  @Post()
  async createJenkinsNotification(
    @Body() dto: CreateTeamProjectAnalysisDto,
  ): Promise<any> {
    return this.teamProjectService.createJenkinsNotification(dto);
  }

  // "새 프로젝트 시작하기"(요구사항 우선) — Jenkins/GitHub 연동 없이 프로젝트만 먼저 생성 (jej_20 Phase 1)
  @Post('/requirements-only')
  @UseGuards(AuthGuard())
  @HttpCode(HttpStatus.CREATED)
  async createRequirementsOnlyProject(
    @GetUser() user: User,
    @Body() dto: CreateRequirementsOnlyProjectDto,
  ): Promise<TeamProjectResponseDto> {
    return this.teamProjectService.createRequirementsOnlyProject(
      user.id,
      dto.teamName,
    );
  }

  // 전체 프로젝트의 빌드 이력(팀명/job명/취약점 수 등)을 반환 — 인증 없이 열려 있던 것을 막는다
  // (PR #61 리뷰 기존 부채). 프론트 어디에서도 호출하지 않는 것을 확인했다.
  @Get('/history')
  @UseGuards(AuthGuard())
  async getBuildHistory(): Promise<TeamProjectResponseDto[]> {
    return this.teamProjectService.getAllBuildHistory();
  }

  // "내 프로젝트" 목록 — 코드 분석 프로젝트/요구사항 전용 프로젝트를 함께 반환 (jej_20 Phase 3)
  @Get('/mine')
  @UseGuards(AuthGuard())
  async getMyProjects(
    @GetUser() user: User,
  ): Promise<TeamProjectResponseDto[]> {
    return this.teamProjectService.getMyProjects(user.id);
  }

  // "내 프로젝트" 카드 순서 저장 (jej_22 Phase 2) — 정적 경로라 :id보다 앞에 둬야 한다
  @Patch('/order')
  @UseGuards(AuthGuard())
  async updateMyProjectsOrder(
    @GetUser() user: User,
    @Body() dto: UpdateTeamProjectsOrderDto,
  ): Promise<void> {
    await this.teamProjectService.updateMyProjectsOrder(
      user.id,
      dto.orderedIds,
    );
  }

  // 프로젝트 상세 — 정적 경로(/history, /mine, /requirements-only, /order)보다 뒤에 둬야 라우트 충돌이 없다 (jej_20 Phase 5)
  @Get(':id')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'id' })
  async getProjectDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TeamProjectResponseDto> {
    return this.teamProjectService.getProjectDetail(id);
  }

  // 프로젝트 삭제 (jej_22 Phase 1)
  @Delete(':id')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProject(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.teamProjectService.deleteProject(id);
  }
}
