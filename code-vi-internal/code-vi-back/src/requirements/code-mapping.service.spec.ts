import { DataSource, Repository } from 'typeorm';
import { CodeMappingService } from './code-mapping.service';
import { ValidationDetail } from './entities/validation-detail.entity';
import { TraceabilityRecord } from './entities/traceability-record.entity';
import { ImplementationScoreSnapshot } from './entities/implementation-score-snapshot.entity';

type Requirement = import('./entities/requirement.entity').Requirement;
type AstSnapshot =
  import('../ast-relational/entity/ast-snapshot.entity').AstSnapshot;

describe('CodeMappingService', () => {
  const makeService = (
    requirements: Partial<Requirement>[],
    snapshot: Partial<AstSnapshot> | null,
    options: {
      validationDetails?: Partial<ValidationDetail>[];
      traceabilityRecords?: Partial<TraceabilityRecord>[];
    } = {},
  ) => {
    const requirementRepository = {
      find: jest.fn().mockResolvedValue(requirements),
    } as unknown as Repository<Requirement>;

    const validationDetailRepository = {
      find: jest.fn().mockResolvedValue(options.validationDetails ?? []),
      findOne: jest.fn(
        async ({ where }: { where: { requirementId: number } }) =>
          (options.validationDetails ?? []).find(
            (d) => d.requirementId === where.requirementId,
          ) ?? null,
      ),
    } as unknown as Repository<ValidationDetail>;

    const traceabilityRecordRepository = {
      find: jest.fn().mockResolvedValue(options.traceabilityRecords ?? []),
    } as unknown as Repository<TraceabilityRecord>;

    const astSnapshotRepository = {
      findOne: jest.fn().mockResolvedValue(snapshot),
    } as unknown as Repository<AstSnapshot>;

    const scoreSnapshotRepository =
      {} as unknown as Repository<ImplementationScoreSnapshot>;

    const updateCalls: { id: number; partial: Record<string, unknown> }[] = [];
    const savedValidationDetails: Record<string, unknown>[] = [];
    const savedTraceabilityRecords: Record<string, unknown>[] = [];
    const savedScoreSnapshots: Record<string, unknown>[] = [];

    const dataSource = {
      transaction: jest.fn(async (cb: (manager: any) => Promise<void>) => {
        const manager = {
          update: jest.fn(
            async (
              _entity: unknown,
              id: number,
              partial: Record<string, unknown>,
            ) => {
              updateCalls.push({ id, partial });
            },
          ),
          delete: jest.fn(async () => undefined),
          create: jest.fn(
            (entity: unknown, plain: Record<string, unknown>) => ({
              __isValidationDetail: entity === ValidationDetail,
              __isTraceabilityRecord: entity === TraceabilityRecord,
              __isScoreSnapshot: entity === ImplementationScoreSnapshot,
              ...plain,
            }),
          ),
          // 2-인자 형태(manager.save(EntityClass, entity)) 호출도 지원한다 —
          // ImplementationScoreSnapshot 저장(jej_23 Phase 10)이 이 형태로 호출된다.
          save: jest.fn(async (arg1: unknown, arg2?: unknown) => {
            const entity = (arg2 ?? arg1) as Record<string, unknown>;
            if (entity.__isValidationDetail)
              savedValidationDetails.push(entity);
            if (entity.__isTraceabilityRecord)
              savedTraceabilityRecords.push(entity);
            if (entity.__isScoreSnapshot) savedScoreSnapshots.push(entity);
            return entity;
          }),
        };
        await cb(manager);
      }),
    } as unknown as DataSource;

    const service = new CodeMappingService(
      dataSource,
      requirementRepository,
      validationDetailRepository,
      traceabilityRecordRepository,
      astSnapshotRepository,
      scoreSnapshotRepository,
    );

    return {
      service,
      updateCalls,
      savedValidationDetails,
      savedTraceabilityRecords,
      savedScoreSnapshots,
      requirementRepository,
    };
  };

  describe('recomputeForTeamProject', () => {
    it('AST 스냅샷이 없으면 모든 요구사항의 점수를 0으로 갱신한다', async () => {
      const requirements = [
        {
          id: 1,
          teamProjectId: 5,
          title: '결제 기능',
          description: '',
          acceptanceCriteria: [],
        },
      ];
      const { service, updateCalls, savedScoreSnapshots } = makeService(
        requirements,
        null,
      );

      const result = await service.recomputeForTeamProject(5);

      expect(result).toEqual({ total: 1, mapped: 0 });
      expect(updateCalls).toEqual([
        { id: 1, partial: { implementationScore: 0 } },
      ]);
      expect(savedScoreSnapshots).toEqual([
        expect.objectContaining({
          teamProjectId: 5,
          requirementId: 1,
          buildNumber: null,
          score: 0,
        }),
      ]);
    });

    it('buildNumber를 전달하면 스코어 스냅샷과 TraceabilityRecord.linkedBuilds에 함께 기록된다(jej_23 Phase 10)', async () => {
      const requirements = [
        {
          id: 1,
          teamProjectId: 5,
          title: '결제 기능',
          description: '',
          acceptanceCriteria: [],
        },
      ];
      const { service, savedScoreSnapshots, savedTraceabilityRecords } =
        makeService(requirements, null);

      await service.recomputeForTeamProject(5, 42);

      expect(savedScoreSnapshots[0]).toMatchObject({
        buildNumber: 42,
        score: 0,
      });
      expect(savedTraceabilityRecords[0].linkedBuilds).toEqual([42]);
    });

    it('매칭되는 코드가 있으면 점수가 갱신되고 ValidationDetail/TraceabilityRecord가 저장된다', async () => {
      const requirements = [
        {
          id: 1,
          teamProjectId: 5,
          title: '사용자 login 기능',
          description: 'login 처리를 담당한다',
          acceptanceCriteria: [],
        },
      ];
      const snapshot = {
        directories: [
          {
            id: 10,
            name: 'src',
            parentDirectoryId: null,
            files: [
              {
                id: 100,
                name: 'login.ts',
                classes: [],
                fileFunctions: [{ id: 200, name: 'handleUserLogin' }],
              },
            ],
          },
        ],
      } as unknown as AstSnapshot;

      const {
        service,
        updateCalls,
        savedValidationDetails,
        savedTraceabilityRecords,
      } = makeService(requirements, snapshot);

      const result = await service.recomputeForTeamProject(5);

      expect(result).toEqual({ total: 1, mapped: 1 });
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0].partial.implementationScore).toBeGreaterThan(0);
      expect(savedValidationDetails).toHaveLength(1);
      expect(savedTraceabilityRecords).toHaveLength(1);
      expect(savedTraceabilityRecords[0].linkedCodeFiles).toEqual([
        'src/login.ts',
      ]);
    });
  });

  describe('getMappingSummary', () => {
    it('요구사항별 implementationScore로 상태를 분류해 반환한다(ValidationDetail 없음)', async () => {
      const requirements = [
        { id: 1, teamProjectId: 5, title: '완료됨', implementationScore: 90 },
        { id: 2, teamProjectId: 5, title: '미구현', implementationScore: 0 },
      ];
      const { service } = makeService(requirements, null);

      const summary = await service.getMappingSummary(5);

      expect(summary.total).toBe(2);
      expect(summary.mapped).toBe(1);
      expect(summary.requirements).toEqual([
        {
          requirementId: 1,
          title: '완료됨',
          implementationScore: 90,
          status: 'implemented',
          similarityAvg: 0,
          matchCount: 0,
          missingCount: 0,
        },
        {
          requirementId: 2,
          title: '미구현',
          implementationScore: 0,
          status: 'unimplemented',
          similarityAvg: 0,
          matchCount: 0,
          missingCount: 0,
        },
      ]);
    });

    it('ValidationDetail/TraceabilityRecord가 있으면 매칭/누락/유사도 통계를 함께 반환한다', async () => {
      const requirements = [
        { id: 1, teamProjectId: 5, title: '완료됨', implementationScore: 90 },
      ];
      const { service } = makeService(requirements, null, {
        validationDetails: [
          { requirementId: 1, matches: [{}, {}], missingLogic: ['누락1'] },
        ],
        traceabilityRecords: [{ requirementId: 1, similarityScore: 0.72 }],
      });

      const summary = await service.getMappingSummary(5);

      expect(summary.requirements[0]).toMatchObject({
        similarityAvg: 0.72,
        matchCount: 2,
        missingCount: 1,
      });
    });
  });

  describe('getMatchDetail (jej_23 Phase 7 후속)', () => {
    it('ValidationDetail이 없으면 빈 배열을 반환한다', async () => {
      const { service } = makeService([], null);
      expect(await service.getMatchDetail(1)).toEqual([]);
    });

    it('저장된 matches를 0~100 점수로 환산해 반환한다', async () => {
      const { service } = makeService([], null, {
        validationDetails: [
          {
            requirementId: 1,
            matches: [
              {
                type: 'function',
                id: 200,
                name: 'handleUserLogin',
                path: 'src/login.ts',
                score: 0.92,
              },
              {
                type: 'file',
                id: 100,
                name: 'login.ts',
                path: 'src/login.ts',
                score: 0.5,
              },
            ],
          },
        ],
      });

      const detail = await service.getMatchDetail(1);

      expect(detail).toEqual([
        {
          type: 'function',
          name: 'handleUserLogin',
          path: 'src/login.ts',
          score: 92,
        },
        { type: 'file', name: 'login.ts', path: 'src/login.ts', score: 50 },
      ]);
    });
  });
});
