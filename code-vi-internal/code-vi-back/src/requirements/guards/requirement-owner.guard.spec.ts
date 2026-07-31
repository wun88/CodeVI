import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RequirementOwnerGuard } from './requirement-owner.guard';

jest.mock('../../team-project/entities/team-project.entity', () => ({
  TeamProject: class TeamProject {},
}));

type Requirement = import('../entities/requirement.entity').Requirement;
type TeamProject =
  import('../../team-project/entities/team-project.entity').TeamProject;

const DEFAULT_USER_ID = 7;

describe('RequirementOwnerGuard', () => {
  const makeContext = (requirementId: string) => {
    const request = {
      params: { id: requirementId },
      user: { id: DEFAULT_USER_ID },
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  const makeGuard = (
    requirement: Partial<Requirement> | null,
    project: Partial<TeamProject> | null,
  ) => {
    const requirementRepository = {
      findOne: jest.fn().mockResolvedValue(requirement),
    } as unknown as Repository<Requirement>;
    const teamProjectRepository = {
      findOne: jest.fn().mockResolvedValue(project),
    } as unknown as Repository<TeamProject>;

    return new RequirementOwnerGuard(
      requirementRepository,
      teamProjectRepository,
    );
  };

  it('요구사항이 존재하지 않으면 NotFoundException', async () => {
    const guard = makeGuard(null, null);
    await expect(guard.canActivate(makeContext('1'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('요청 사용자가 요구사항이 속한 프로젝트의 멤버가 아니면 ForbiddenException', async () => {
    const guard = makeGuard(
      { id: 1, teamProjectId: 10 } as Partial<Requirement>,
      { id: 10, users: [{ id: 999 }] } as unknown as Partial<TeamProject>,
    );
    await expect(guard.canActivate(makeContext('1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('요청 사용자가 멤버면 통과시킨다', async () => {
    const guard = makeGuard(
      { id: 1, teamProjectId: 10 } as Partial<Requirement>,
      {
        id: 10,
        users: [{ id: DEFAULT_USER_ID }],
      } as unknown as Partial<TeamProject>,
    );
    await expect(guard.canActivate(makeContext('1'))).resolves.toBe(true);
  });
});
