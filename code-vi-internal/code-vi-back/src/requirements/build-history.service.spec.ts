import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BuildHistoryService } from './build-history.service';

type CodeAnalysis =
  import('../code-analysis/entities/code-analysis.entity').CodeAnalysis;
type ImplementationScoreSnapshot =
  import('./entities/implementation-score-snapshot.entity').ImplementationScoreSnapshot;
type Requirement = import('./entities/requirement.entity').Requirement;

describe('BuildHistoryService (jej_23 Phase 10)', () => {
  const makeService = (
    builds: Partial<CodeAnalysis>[],
    snapshots: Partial<ImplementationScoreSnapshot>[],
    requirements: Partial<Requirement>[] = [],
  ) => {
    const codeAnalysisRepository = {
      find: jest.fn(async ({ where }: { where: { teamProjectId: number } }) =>
        builds
          .filter((b) => b.teamProjectId === where.teamProjectId)
          .sort(
            (a, b) => (b.buildNumber as number) - (a.buildNumber as number),
          ),
      ),
      findOne: jest.fn(
        async ({
          where,
        }: {
          where: { teamProjectId: number; buildNumber: number };
        }) =>
          builds.find(
            (b) =>
              b.teamProjectId === where.teamProjectId &&
              b.buildNumber === where.buildNumber,
          ) ?? null,
      ),
    } as unknown as Repository<CodeAnalysis>;

    const scoreSnapshotRepository = {
      find: jest.fn(
        async ({
          where,
        }: {
          where: {
            teamProjectId: number;
            buildNumber?: number | { value: number[] };
            requirementId?: number;
          };
        }) => {
          let result = snapshots.filter(
            (s) => s.teamProjectId === where.teamProjectId,
          );
          if (where.requirementId !== undefined) {
            result = result.filter(
              (s) => s.requirementId === where.requirementId,
            );
          }
          if (where.buildNumber !== undefined) {
            if (typeof where.buildNumber === 'number') {
              result = result.filter(
                (s) => s.buildNumber === where.buildNumber,
              );
            } else {
              const ids = where.buildNumber.value;
              result = result.filter(
                (s) => s.buildNumber != null && ids.includes(s.buildNumber),
              );
            }
          }
          return [...result].sort(
            (a, b) =>
              (a.createdAt as unknown as Date).getTime() -
              (b.createdAt as unknown as Date).getTime(),
          );
        },
      ),
      findOne: jest.fn(
        async ({
          where,
        }: {
          where: {
            teamProjectId: number;
            requirementId: number;
            createdAt: { value: Date };
          };
        }) => {
          const before = where.createdAt.value;
          const candidates = snapshots
            .filter(
              (s) =>
                s.teamProjectId === where.teamProjectId &&
                s.requirementId === where.requirementId &&
                (s.createdAt as unknown as Date).getTime() < before.getTime(),
            )
            .sort(
              (a, b) =>
                (b.createdAt as unknown as Date).getTime() -
                (a.createdAt as unknown as Date).getTime(),
            );
          return candidates[0] ?? null;
        },
      ),
    } as unknown as Repository<ImplementationScoreSnapshot>;

    const requirementRepository = {
      find: jest.fn(async () => requirements),
    } as unknown as Repository<Requirement>;

    return {
      service: new BuildHistoryService(
        codeAnalysisRepository,
        scoreSnapshotRepository,
        requirementRepository,
      ),
    };
  };

  const build = (
    buildNumber: number,
    overrides: Partial<CodeAnalysis> = {},
  ): Partial<CodeAnalysis> => ({
    teamProjectId: 1,
    buildNumber,
    status: 'SUCCESS',
    buildUrl: `https://jenkins/${buildNumber}`,
    commitHash: `sha-${buildNumber}`,
    createdAt: new Date(
      2026,
      0,
      buildNumber,
    ) as unknown as CodeAnalysis['createdAt'],
    ...overrides,
  });

  const snap = (
    buildNumber: number | null,
    requirementId: number,
    score: number,
    createdAt: Date,
  ): Partial<ImplementationScoreSnapshot> => ({
    teamProjectId: 1,
    requirementId,
    buildNumber,
    score,
    createdAt: createdAt as unknown as ImplementationScoreSnapshot['createdAt'],
  });

  describe('getBuildHistory', () => {
    it('빌드가 없으면 빈 배열을 반환한다', async () => {
      const { service } = makeService([], []);
      expect(await service.getBuildHistory(1)).toEqual([]);
    });

    it('빌드별 평균 점수와 직전 빌드 대비 증감을 계산한다', async () => {
      const { service } = makeService(
        [build(1), build(2)],
        [
          snap(1, 10, 40, new Date(2026, 0, 1)),
          snap(1, 11, 60, new Date(2026, 0, 1)),
          snap(2, 10, 70, new Date(2026, 0, 2)),
          snap(2, 11, 90, new Date(2026, 0, 2)),
        ],
      );

      const history = await service.getBuildHistory(1);

      expect(history).toHaveLength(2);
      // 최신순(DESC) 반환
      expect(history[0]).toMatchObject({
        buildNumber: 2,
        averageScore: 80,
        scoreDelta: 30,
      });
      expect(history[1]).toMatchObject({
        buildNumber: 1,
        averageScore: 50,
        scoreDelta: null,
      });
    });

    it('스코어 스냅샷이 없는 빌드는 averageScore가 null이다', async () => {
      const { service } = makeService([build(1)], []);
      const history = await service.getBuildHistory(1);
      expect(history[0].averageScore).toBeNull();
    });
  });

  describe('getBuildDetail', () => {
    it('존재하지 않는 빌드면 NotFoundException', async () => {
      const { service } = makeService([], []);
      await expect(service.getBuildDetail(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('이전 스냅샷과 점수가 다른 요구사항만 changedRequirements에 담는다', async () => {
      const { service } = makeService(
        [build(1), build(2)],
        [
          snap(1, 10, 40, new Date(2026, 0, 1)),
          snap(2, 10, 70, new Date(2026, 0, 2)), // 40 → 70, 변경됨
          snap(1, 11, 50, new Date(2026, 0, 1)),
          snap(2, 11, 50, new Date(2026, 0, 2)), // 50 → 50, 변경 없음
        ],
        [
          { id: 10, title: '요구사항 A' },
          { id: 11, title: '요구사항 B' },
        ],
      );

      const detail = await service.getBuildDetail(1, 2);

      expect(detail.changedRequirements).toEqual([
        {
          requirementId: 10,
          title: '요구사항 A',
          previousScore: 40,
          currentScore: 70,
        },
      ]);
    });

    it('이전 스냅샷이 없는 요구사항(신규 채점)은 previousScore가 null로 changedRequirements에 담긴다', async () => {
      const { service } = makeService(
        [build(1)],
        [snap(1, 10, 55, new Date(2026, 0, 1))],
        [{ id: 10, title: '요구사항 A' }],
      );

      const detail = await service.getBuildDetail(1, 1);

      expect(detail.changedRequirements).toEqual([
        {
          requirementId: 10,
          title: '요구사항 A',
          previousScore: null,
          currentScore: 55,
        },
      ]);
    });
  });

  describe('getScoreTimeline', () => {
    it('requirementId로 필터링하면 해당 요구사항의 스냅샷만 시간순으로 반환한다', async () => {
      const { service } = makeService(
        [],
        [
          snap(1, 10, 40, new Date(2026, 0, 1)),
          snap(2, 10, 70, new Date(2026, 0, 2)),
          snap(2, 11, 90, new Date(2026, 0, 2)),
        ],
      );

      const timeline = await service.getScoreTimeline(1, 10);

      expect(timeline).toEqual([
        expect.objectContaining({ requirementId: 10, score: 40 }),
        expect.objectContaining({ requirementId: 10, score: 70 }),
      ]);
    });

    it('requirementId 없이 호출하면 프로젝트 전체 스냅샷을 반환한다(재검증 2회 이상 실행 시 순서대로)', async () => {
      const { service } = makeService(
        [],
        [
          snap(null, 10, 30, new Date(2026, 0, 1)),
          snap(null, 10, 60, new Date(2026, 0, 2)),
        ],
      );

      const timeline = await service.getScoreTimeline(1);

      expect(timeline.map((t) => t.score)).toEqual([30, 60]);
    });
  });
});
