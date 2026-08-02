import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TeamProjectService } from './team-project.service';
import { RequirementsService } from '../requirements/requirements.service';

// team-project.entity.ts는 ast-relational 엔티티 체인을 relative import로 끌고 오는데,
// 그중 일부(`src/...` 절대경로 스타일)가 jest(rootDir: src) 아래서는 해석되지 않는다.
jest.mock('./entities/team-project.entity', () => ({
  TeamProject: class TeamProject {},
}));

type TeamProject = import('./entities/team-project.entity').TeamProject;
type User = import('../users/entities/user.entity').User;

/**
 * TeamProjectService.createRequirementsOnlyProject 단위 테스트 (jej_20 Phase 1).
 * "새 프로젝트 시작하기" — Jenkins/GitHub 연동 없이 TeamProject만 생성하는 경로를 검증한다.
 */
describe('TeamProjectService.createRequirementsOnlyProject', () => {
  const user = { id: 7, username: 'jej031020' } as User;

  const makeService = (foundUser: User | null) => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(foundUser),
    } as unknown as Repository<User>;

    const teamProjectRepository = {} as unknown as Repository<TeamProject>;

    const dataSource = {
      transaction: jest.fn(
        async (cb: (manager: any) => Promise<TeamProject>) => {
          const manager = {
            create: jest.fn(
              (_entity: unknown, plain: Partial<TeamProject>) => plain,
            ),
            save: jest.fn(async (entity: Partial<TeamProject>) => ({
              id: 1,
              ...entity,
            })),
          };
          return cb(manager);
        },
      ),
    } as unknown as DataSource;

    const httpService = {} as HttpService;
    const configService = {} as ConfigService;
    const requirementsService = {} as RequirementsService;

    return new TeamProjectService(
      dataSource,
      teamProjectRepository,
      userRepository,
      httpService,
      configService,
      requirementsService,
    );
  };

  it('로그인 사용자를 찾을 수 없으면 NotFoundException을 던진다', async () => {
    const service = makeService(null);
    await expect(
      service.createRequirementsOnlyProject(99, '요구사항만 있는 프로젝트'),
    ).rejects.toThrow(NotFoundException);
  });

  it('Jenkins/GitHub 정보 없이 TeamProject를 생성하고 현재 사용자를 연결한다', async () => {
    const service = makeService(user);

    const dto = await service.createRequirementsOnlyProject(
      user.id,
      '쇼핑몰 리뉴얼 기획',
    );

    expect(dto.teamName).toBe('쇼핑몰 리뉴얼 기획');
    expect(dto.jenkinsJobName).toBeNull();
    expect(dto.members).toEqual([user.username]);
  });

  // 회귀 방지: 응답이 DTO를 거치지 않고 원본 User 엔티티(password 해시 등)를 그대로
  // 노출하던 버그가 다시 생기지 않는지 확인한다.
  it('응답 DTO에 password 등 User 엔티티의 민감 필드가 포함되지 않는다', async () => {
    const service = makeService(user);

    const dto = await service.createRequirementsOnlyProject(
      user.id,
      '쇼핑몰 리뉴얼 기획',
    );

    expect(dto).not.toHaveProperty('users');
    expect(JSON.stringify(dto)).not.toContain('password');
  });
});

/**
 * TeamProjectService.getMyProjects 단위 테스트 (jej_20 Phase 3).
 * "내 프로젝트" 목록 — 코드 프로젝트와 요구사항 전용 프로젝트가 함께 반환되는지 검증한다.
 */
describe('TeamProjectService.getMyProjects', () => {
  it('코드 분석이 있는 프로젝트와 요구사항만 있는 프로젝트를 함께 반환한다', async () => {
    const codeProject = { id: 1, teamName: '코드 프로젝트', users: [] };
    const requirementsOnlyProject = {
      id: 2,
      teamName: '요구사항 전용 프로젝트',
      users: [],
    };

    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([codeProject, requirementsOnlyProject]),
    };

    const teamProjectRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<TeamProject>;

    const requirementsService = {
      countByTeamProjectIds: jest.fn().mockResolvedValue(new Map([[2, 3]])),
    } as unknown as RequirementsService;

    const service = new TeamProjectService(
      {} as DataSource,
      teamProjectRepository,
      {} as Repository<User>,
      {} as HttpService,
      {} as ConfigService,
      requirementsService,
    );

    const result = await service.getMyProjects(7);

    expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
      'project.users',
      'membership',
      'membership.id = :userId',
      { userId: 7 },
    );
    expect(result).toHaveLength(2);
    expect(result[0].requirementsCount).toBe(0);
    expect(result[1].requirementsCount).toBe(3);
    expect(result[1].statusVariant).toBe('requirements_only');
  });
});
