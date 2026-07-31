import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requirement } from '../entities/requirement.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { User } from '../../users/entities/user.entity';

interface RequestWithRequirementParams {
  params: Record<string, string>;
  user: User;
}

/**
 * PATCH/DELETE /api/requirements/:id 전용 — 라우트에는 요구사항 자신의 id만 있고
 * teamProjectId는 요구사항을 통해서만 알 수 있어, teamProjectId가 request에 직접 실려 있는
 * 경우만 다루는 ProjectMemberGuard(jej_22 인가 가드 통합)를 그대로 쓸 수 없다.
 * 요구사항 → teamProjectId → 멤버십 순으로 조회해 검증한다.
 */
@Injectable()
export class RequirementOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Requirement)
    private readonly requirementRepository: Repository<Requirement>,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithRequirementParams>();
    const id = Number(request.params.id);

    const requirement = await this.requirementRepository.findOne({
      where: { id },
    });
    if (!requirement) {
      throw new NotFoundException('요구사항을 찾을 수 없습니다.');
    }

    const project = await this.teamProjectRepository.findOne({
      where: { id: requirement.teamProjectId },
      relations: ['users'],
    });
    const isMember = project?.users?.some((u) => u.id === request.user.id);
    if (!isMember) {
      throw new ForbiddenException('이 프로젝트에 접근할 권한이 없습니다.');
    }

    return true;
  }
}
