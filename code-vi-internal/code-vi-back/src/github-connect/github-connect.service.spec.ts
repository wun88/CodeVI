import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { GithubConnectService } from './github-connect.service';
import { RegisterProjectRequestDto } from './dto/register-project-request.dto';

// team-project.entity.ts는 ast-relational 엔티티 체인을 끌고 오므로, 가벼운 단위 테스트를 위해
// 더미로 대체한다 (team-project.service.spec.ts와 동일한 컨벤션).
jest.mock('../team-project/entities/team-project.entity', () => ({
  TeamProject: class TeamProject {},
}));

const mockRepoGet = jest.fn();
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: { get: mockRepoGet },
  })),
}));

type TeamProject =
  import('../team-project/entities/team-project.entity').TeamProject;

/**
 * GithubConnectService.registerProject — "기존 프로젝트에 코드 연결" 모드 단위 테스트 (jej_20 Phase 5).
 * teamProjectId가 dto에 있을 때 신규 생성 대신 기존 프로젝트에 붙는지, 멤버십/중복 연결 검증이
 * 동작하는지 확인한다. teamProjectId 없는 기존(신규 생성) 경로는 이 테스트 범위 밖.
 */
describe('GithubConnectService.registerProject — 기존 프로젝트에 코드 연결', () => {
  const user = { id: 7 };
  const teamProjectId = 42;
  const dto: RegisterProjectRequestDto = {
    owner: 'octo',
    repo: 'demo',
    teamProjectId,
  };

  const makeService = (
    existingProject: Partial<TeamProject> | null | undefined,
  ) => {
    mockRepoGet.mockResolvedValue({ data: { default_branch: 'main' } });

    const resolvedProject =
      existingProject === undefined
        ? { id: teamProjectId, users: [user], githubRepoFullName: null }
        : existingProject;

    const teamProjectRepository = {
      findOne: jest.fn((options: { where: Record<string, unknown> }) => {
        if ('id' in options.where) {
          return Promise.resolve(
            options.where.id === teamProjectId ? resolvedProject : null,
          );
        }
        // JenkinsJobName 중복 체크 — 이 테스트들에서는 항상 충돌 없음
        return Promise.resolve(null);
      }),
      update: jest.fn(),
    } as unknown as Repository<TeamProject>;

    const authService = {
      getDecryptedGithubToken: jest.fn().mockResolvedValue('gh-token'),
    };
    const githubService = { injectJenkinsfileWithToken: jest.fn() };
    const jenkinsService = { createPipelineJob: jest.fn() };
    const userRepository = { findOne: jest.fn() } as unknown as Repository<
      import('../users/entities/user.entity').User
    >;

    const service = new GithubConnectService(
      {} as JwtService,
      authService as any,
      githubService as any,
      jenkinsService as any,
      {} as DataSource,
      teamProjectRepository,
      userRepository,
    );

    return { service, teamProjectRepository, githubService };
  };

  // 멤버십 검증(본인이 속하지 않은 프로젝트 403)은 ProjectMemberGuard(jej_22 인가 가드 통합)로
  // 옮겨졌다 — project-member.guard.spec.ts에서 검증한다.

  it('이미 코드가 연결된 프로젝트면 ConflictException(409)을 던진다', async () => {
    const { service } = makeService({
      id: teamProjectId,
      users: [user as any],
      githubRepoFullName: 'octo/already-connected',
    });

    await expect(service.registerProject(user.id, dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('존재하지 않는 프로젝트 id면 NotFoundException(404)을 던진다', async () => {
    const { service } = makeService(null);

    await expect(service.registerProject(user.id, dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('본인 소유·미연결 프로젝트면 새로 만들지 않고 기존 프로젝트를 갱신한다', async () => {
    const { service, teamProjectRepository } = makeService(undefined);

    const result = await service.registerProject(user.id, dto);

    expect(result).toEqual({
      teamProjectId,
      jenkinsJobName: 'octo-demo',
      githubRepoFullName: 'octo/demo',
    });
    expect(teamProjectRepository.update).toHaveBeenCalledWith(
      teamProjectId,
      expect.objectContaining({
        JenkinsJobName: 'octo-demo',
        githubRepoFullName: 'octo/demo',
        githubDefaultBranch: 'main',
      }),
    );
  });
});
