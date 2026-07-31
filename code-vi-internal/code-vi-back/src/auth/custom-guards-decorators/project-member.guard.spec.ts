import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { ProjectMemberGuard } from './project-member.guard';
import { ProjectMemberOptions } from './project-member.decorator';

// team-project.entity.ts는 ast-relational 엔티티 체인을 relative import로 끌고 오는데,
// 그중 일부가 jest(rootDir: src) 아래서는 해석되지 않는다 (team-project.service.spec.ts와
// 동일한 기존 워크어라운드).
jest.mock('../../team-project/entities/team-project.entity', () => ({
  TeamProject: class TeamProject {},
}));

type TeamProject =
  import('../../team-project/entities/team-project.entity').TeamProject;

const DEFAULT_USER_ID = 7;

describe('ProjectMemberGuard', () => {
  const makeContext = (
    request: Record<string, unknown>,
    metadata: ProjectMemberOptions | undefined,
  ) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(metadata),
    } as unknown as Reflector;

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { reflector, context };
  };

  const makeGuard = (
    reflector: Reflector,
    project: Partial<TeamProject> | null,
  ) => {
    const teamProjectRepository = {
      findOne: jest.fn().mockResolvedValue(project),
    } as unknown as Repository<TeamProject>;

    return new ProjectMemberGuard(reflector, teamProjectRepository);
  };

  it('메타데이터가 없으면(=@ProjectMember 미사용 라우트) 통과시킨다', async () => {
    const { reflector, context } = makeContext({}, undefined);
    const guard = makeGuard(reflector, null);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('필수 필드인데 값이 없으면 NotFoundException', async () => {
    const { reflector, context } = makeContext(
      { params: {}, user: { id: DEFAULT_USER_ID } },
      { source: 'params', field: 'teamProjectId' },
    );
    const guard = makeGuard(reflector, null);

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('optional 필드인데 값이 없으면 통과시킨다', async () => {
    const { reflector, context } = makeContext(
      { body: {}, user: { id: DEFAULT_USER_ID } },
      { source: 'body', field: 'teamProjectId', optional: true },
    );
    const guard = makeGuard(reflector, null);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('프로젝트가 존재하지 않으면 NotFoundException', async () => {
    const { reflector, context } = makeContext(
      { params: { teamProjectId: '1' }, user: { id: DEFAULT_USER_ID } },
      { source: 'params', field: 'teamProjectId' },
    );
    const guard = makeGuard(reflector, null);

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('요청 사용자가 프로젝트 멤버가 아니면 ForbiddenException', async () => {
    const { reflector, context } = makeContext(
      { params: { teamProjectId: '1' }, user: { id: DEFAULT_USER_ID } },
      { source: 'params', field: 'teamProjectId' },
    );
    const guard = makeGuard(reflector, {
      id: 1,
      users: [{ id: 999 }],
    } as unknown as Partial<TeamProject>);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('요청 사용자가 프로젝트 멤버면 통과시킨다', async () => {
    const { reflector, context } = makeContext(
      { params: { teamProjectId: '1' }, user: { id: DEFAULT_USER_ID } },
      { source: 'params', field: 'teamProjectId' },
    );
    const guard = makeGuard(reflector, {
      id: 1,
      users: [{ id: DEFAULT_USER_ID }],
    } as unknown as Partial<TeamProject>);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('query/body 등 다른 source에서도 값을 읽는다', async () => {
    const { reflector, context } = makeContext(
      { query: { teamProjectId: '1' }, user: { id: DEFAULT_USER_ID } },
      { source: 'query', field: 'teamProjectId' },
    );
    const guard = makeGuard(reflector, {
      id: 1,
      users: [{ id: DEFAULT_USER_ID }],
    } as unknown as Partial<TeamProject>);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
