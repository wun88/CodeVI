import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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

// GitHub Repository 연동(Code Insight > Project Analysis > GitHub 연동) — OAuth App의 repo scope를
// 사용해 사용자의 레포 목록을 조회하고, 선택한 레포를 분석 대상 프로젝트로 등록한다.
// 실제 OAuth 인가/토큰교환 콜백은 로그인과 콜백 URL을 공유한다 — auth.controller.ts 참고.
@Controller('github')
export class GithubConnectController {
  constructor(private readonly githubConnectService: GithubConnectService) {}

  @Get('connect')
  connectStart(@Query('token') token: string, @Res() res: Response) {
    const url = this.githubConnectService.buildAuthorizeRedirectUrl(token);
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
  @UseGuards(AuthGuard())
  @HttpCode(HttpStatus.CREATED)
  async registerProject(@GetUser() user: User, @Body() dto: RegisterProjectRequestDto) {
    return this.githubConnectService.registerProject(user.id, dto);
  }

  @Delete('connection')
  @UseGuards(AuthGuard())
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@GetUser() user: User): Promise<void> {
    await this.githubConnectService.disconnect(user.id);
  }
}
