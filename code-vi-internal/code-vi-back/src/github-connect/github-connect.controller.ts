import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { GetUser } from '../auth/custom-guards-decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { GithubConnectService } from './github-connect.service';
import { RegisterProjectRequestDto } from './dto/register-project-request.dto';
import { ProjectMember } from '../auth/custom-guards-decorators/project-member.decorator';
import { ProjectMemberGuard } from '../auth/custom-guards-decorators/project-member.guard';

// GitHub Repository 연동(Code Insight > Project Analysis > GitHub 연동) — OAuth App의 repo scope를
// 사용해 사용자의 레포 목록을 조회하고, 선택한 레포를 분석 대상 프로젝트로 등록한다.
// 실제 OAuth 인가/토큰교환 콜백은 로그인과 콜백 URL을 공유한다 — auth.controller.ts 참고.
@Controller('github')
export class GithubConnectController {
  constructor(private readonly githubConnectService: GithubConnectService) {}

  @Get('connect')
  connectStart(
    @Query('token') token: string,
    @Query('teamProjectId') teamProjectId: string | undefined,
    @Res() res: Response,
  ) {
    const url = this.githubConnectService.buildAuthorizeRedirectUrl(
      token,
      teamProjectId ? Number(teamProjectId) : undefined,
    );
    return res.redirect(url);
  }

  @Get('connection')
  @UseGuards(AuthGuard())
  async getConnection(@GetUser() user: User) {
    return this.githubConnectService.getConnectionStatus(user.id);
  }

  @Get('repositories')
  @UseGuards(AuthGuard())
  async listRepositories(@GetUser() user: User) {
    return this.githubConnectService.listRepositories(user.id);
  }

  @Post('projects')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'body', field: 'teamProjectId', optional: true })
  @HttpCode(HttpStatus.CREATED)
  async registerProject(
    @GetUser() user: User,
    @Body() dto: RegisterProjectRequestDto,
  ) {
    return this.githubConnectService.registerProject(user.id, dto);
  }

  /** 연결된 코드의 분석 재요청 — 사용자 토큰으로 Jenkins credential/잡을 갱신하고 빌드를 다시 트리거 */
  @Post('projects/:teamProjectId/reanalyze')
  @UseGuards(AuthGuard(), ProjectMemberGuard)
  @ProjectMember({ source: 'params', field: 'teamProjectId' })
  @HttpCode(HttpStatus.ACCEPTED)
  async reanalyzeProject(
    @GetUser() user: User,
    @Param('teamProjectId', ParseIntPipe) teamProjectId: number,
  ) {
    return this.githubConnectService.reanalyzeProject(user.id, teamProjectId);
  }

  @Delete('connection')
  @UseGuards(AuthGuard())
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@GetUser() user: User): Promise<void> {
    await this.githubConnectService.disconnect(user.id);
  }
}
