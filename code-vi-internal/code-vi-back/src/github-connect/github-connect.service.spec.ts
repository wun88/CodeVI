import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
      getGithubConnection: jest
        .fn()
        .mockResolvedValue({ githubUsername: 'octo' }),
    };
    const githubService = { injectJenkinsfileWithToken: jest.fn() };
    const jenkinsService = {
      createPipelineJob: jest.fn(),
      ensureUserCredential: jest.fn(),
    };
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

    return { service, teamProjectRepository, githubService, jenkinsService };
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

  it('사용자 OAuth 토큰을 Jenkins credential로 올리고 그 credential로 잡을 만든다', async () => {
    const { service, jenkinsService } = makeService(undefined);

    await service.registerProject(user.id, dto);

    expect(jenkinsService.ensureUserCredential).toHaveBeenCalledWith(
      `github-oauth-u${user.id}`,
      'octo',
      'gh-token',
    );
    expect(jenkinsService.createPipelineJob).toHaveBeenCalledWith(
      'octo-demo',
      'https://github.com/octo/demo',
      `github-oauth-u${user.id}`,
    );
  });
});

/**
 * reanalyzeProject — 공용 PAT 시절 만들어진(또는 실패한) 잡을 호출자의 OAuth 토큰 credential로
 * 갱신하고 빌드를 재트리거하는 복구 경로 검증.
 */
describe('GithubConnectService.reanalyzeProject', () => {
  const user = { id: 7 };
  const teamProjectId = 42;

  const makeService = (project: Record<string, unknown> | null) => {
    mockRepoGet.mockResolvedValue({ data: { default_branch: 'main' } });

    const teamProjectRepository = {
      findOne: jest.fn().mockResolvedValue(project),
    } as unknown as Repository<TeamProject>;
    const authService = {
      getDecryptedGithubToken: jest.fn().mockResolvedValue('gh-token'),
      getGithubConnection: jest
        .fn()
        .mockResolvedValue({ githubUsername: 'octo' }),
    };
    const jenkinsService = {
      createPipelineJob: jest.fn(),
      ensureUserCredential: jest.fn(),
    };

    const service = new GithubConnectService(
      {} as JwtService,
      authService as any,
      { injectJenkinsfileWithToken: jest.fn() } as any,
      jenkinsService as any,
      {} as DataSource,
      teamProjectRepository,
      { findOne: jest.fn() } as unknown as Repository<
        import('../users/entities/user.entity').User
      >,
    );

    return { service, jenkinsService };
  };

  it('credential 갱신 후 잡 config를 사용자 credential로 덮어쓰고 빌드를 트리거한다', async () => {
    const { service, jenkinsService } = makeService({
      id: teamProjectId,
      JenkinsJobName: 'octo-demo',
      githubRepoFullName: 'octo/demo',
    });

    const result = await service.reanalyzeProject(user.id, teamProjectId);

    expect(result).toEqual({ teamProjectId, jenkinsJobName: 'octo-demo' });
    expect(jenkinsService.ensureUserCredential).toHaveBeenCalledWith(
      `github-oauth-u${user.id}`,
      'octo',
      'gh-token',
    );
    expect(jenkinsService.createPipelineJob).toHaveBeenCalledWith(
      'octo-demo',
      'https://github.com/octo/demo',
      `github-oauth-u${user.id}`,
    );
  });

  it('코드가 연결되지 않은 프로젝트면 ConflictException을 던진다', async () => {
    const { service } = makeService({
      id: teamProjectId,
      JenkinsJobName: null,
      githubRepoFullName: null,
    });

    await expect(
      service.reanalyzeProject(user.id, teamProjectId),
    ).rejects.toThrow(ConflictException);
  });

  it('호출자 토큰으로 저장소 접근이 안 되면 ForbiddenException을 던진다', async () => {
    const { service, jenkinsService } = makeService({
      id: teamProjectId,
      JenkinsJobName: 'octo-demo',
      githubRepoFullName: 'octo/demo',
    });
    mockRepoGet.mockRejectedValue({ status: 403 });

    await expect(
      service.reanalyzeProject(user.id, teamProjectId),
    ).rejects.toThrow(ForbiddenException);
    // 접근 불가 토큰으로 credential을 덮어쓰지 않는다 — 저장소 주인의 정상 credential 보호
    expect(jenkinsService.ensureUserCredential).not.toHaveBeenCalled();
  });
});
