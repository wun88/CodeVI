import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { User } from '../../users/entities/user.entity';
import {
  PROJECT_MEMBER_KEY,
  ProjectMemberOptions,
} from './project-member.decorator';

interface RequestWithAuthorizedFields {
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  user: User;
}

@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<
      ProjectMemberOptions | undefined
    >(PROJECT_MEMBER_KEY, [context.getHandler(), context.getClass()]);
    if (!options) return true;

    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuthorizedFields>();
    const raw = request[options.source]?.[options.field];

    if (raw === undefined || raw === null || raw === '') {
      if (options.optional) return true;
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    const teamProjectId = Number(raw);
    const project = await this.teamProjectRepository.findOne({
      where: { id: teamProjectId },
      relations: ['users'],
    });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');

    const user: User = request.user;
    const isMember = project.users?.some((u) => u.id === user.id);
    if (!isMember) {
      throw new ForbiddenException('이 프로젝트에 접근할 권한이 없습니다.');
    }

    return true;
  }
}
