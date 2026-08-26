import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RequirementDependencyService } from './requirement-dependency.service';
import { Requirement } from './entities/requirement.entity';
import { RequirementDependency } from './entities/requirement-dependency.entity';
import { DependencyType } from './entities/dependency-type.enum';
import { TraceabilityRecord } from './entities/traceability-record.entity';

describe('RequirementDependencyService (jej_23 Phase 8)', () => {
  const makeService = (
    requirements: Partial<Requirement>[],
    traceabilityRecords: Partial<TraceabilityRecord>[] = [],
  ) => {
    const requirementRepository = {
      findOne: jest.fn(
        async ({ where }: { where: { id: number } }) =>
          requirements.find((r) => r.id === where.id) ?? null,
      ),
      find: jest.fn(
        async ({ where }: { where: { id: { value: number[] } } }) => {
          // In(ids)는 typeorm FindOperator라 실제 값은 .value에 담긴다.
          const ids: number[] = (where.id as unknown as { value: number[] })
            .value;
          return requirements.filter((r) => ids.includes(r.id as number));
        },
      ),
    } as unknown as Repository<Requirement>;

    let saved: Partial<RequirementDependency>[] = [];
    const dependencyRepository = {
      create: jest.fn((plain: Partial<RequirementDependency>) => plain),
      save: jest.fn(async (entity: Partial<RequirementDependency>) => {
        const withId = { id: saved.length + 1, ...entity };
        saved.push(withId);
        return withId;
      }),
      findOne: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          saved.find((d) =>
            Object.entries(where).every(
              ([key, value]) => (d as Record<string, unknown>)[key] === value,
            ),
          ) ?? null,
      ),
      find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        saved.filter((d) =>
          Object.entries(where).every(
            ([key, value]) => (d as Record<string, unknown>)[key] === value,
          ),
        ),
      ),
      delete: jest.fn(async (id: number) => {
        saved = saved.filter((d) => d.id !== id);
      }),
    } as unknown as Repository<RequirementDependency>;

    const traceabilityRecordRepository = {
      findOne: jest.fn(
        async ({ where }: { where: { requirementId: number } }) =>
          traceabilityRecords.find(
            (t) => t.requirementId === where.requirementId,
          ) ?? null,
      ),
    } as unknown as Repository<TraceabilityRecord>;

    return {
      service: new RequirementDependencyService(
        dependencyRepository,
        requirementRepository,
        traceabilityRecordRepository,
      ),
      dependencyRepository,
    };
  };

  const req = (id: number, teamProjectId = 1): Partial<Requirement> => ({
    id,
    teamProjectId,
    title: `요구사항 ${id}`,
  });

  describe('create', () => {
    it('자기 자신을 대상으로 지정하면 BadRequestException', async () => {
      const { service } = makeService([req(1)]);
      await expect(
        service.create(1, {
          targetRequirementId: 1,
          type: DependencyType.RELATED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 대상 요구사항이면 NotFoundException', async () => {
      const { service } = makeService([req(1)]);
      await expect(
        service.create(1, {
          targetRequirementId: 999,
          type: DependencyType.RELATED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('서로 다른 프로젝트 소속이면 BadRequestException', async () => {
      const { service } = makeService([req(1, 1), req(2, 2)]);
      await expect(
        service.create(1, {
          targetRequirementId: 2,
          type: DependencyType.RELATED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('정상 요청이면 의존관계를 저장한다', async () => {
      const { service } = makeService([req(1), req(2)]);
      const dependency = await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.DEPENDS_ON,
      });

      expect(dependency).toMatchObject({
        requirementId: 1,
        targetRequirementId: 2,
        type: DependencyType.DEPENDS_ON,
      });
    });

    it('이미 등록된 의존관계면 BadRequestException', async () => {
      const { service } = makeService([req(1), req(2)]);
      await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.DEPENDS_ON,
      });

      await expect(
        service.create(1, {
          targetRequirementId: 2,
          type: DependencyType.DEPENDS_ON,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('순환 참조(A depends_on B depends_on A)는 BadRequestException', async () => {
      const { service } = makeService([req(1), req(2)]);
      await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.DEPENDS_ON,
      });

      await expect(
        service.create(2, {
          targetRequirementId: 1,
          type: DependencyType.DEPENDS_ON,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('간접 순환(A→B→C→A)도 차단한다', async () => {
      const { service } = makeService([req(1), req(2), req(3)]);
      await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.DEPENDS_ON,
      });
      await service.create(2, {
        targetRequirementId: 3,
        type: DependencyType.DEPENDS_ON,
      });

      await expect(
        service.create(3, {
          targetRequirementId: 1,
          type: DependencyType.DEPENDS_ON,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('depends_on이 아닌 타입은 순환이어도 허용한다(related 등은 방향성 제약이 없음)', async () => {
      const { service } = makeService([req(1), req(2)]);
      await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.RELATED,
      });

      await expect(
        service.create(2, {
          targetRequirementId: 1,
          type: DependencyType.RELATED,
        }),
      ).resolves.toMatchObject({ requirementId: 2, targetRequirementId: 1 });
    });
  });

  describe('remove', () => {
    it('본인 소유가 아닌 의존관계를 지우려 하면 NotFoundException', async () => {
      const { service } = makeService([req(1), req(2)]);
      const dependency = await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.RELATED,
      });

      await expect(service.remove(2, dependency.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('정상 삭제하면 목록에서 사라진다', async () => {
      const { service } = makeService([req(1), req(2)]);
      const dependency = await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.RELATED,
      });

      await service.remove(1, dependency.id);

      const list = await service.findByRequirement(1);
      expect(list.outgoing).toHaveLength(0);
    });
  });

  describe('findByRequirement / getImpact', () => {
    it('나가는/들어오는 의존관계를 상대 요구사항 제목과 함께 반환한다', async () => {
      const { service } = makeService([req(1), req(2), req(3)]);
      await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.DEPENDS_ON,
      });
      await service.create(3, {
        targetRequirementId: 1,
        type: DependencyType.CONFLICTS_WITH,
      });

      const list = await service.findByRequirement(1);

      expect(list.outgoing).toEqual([
        expect.objectContaining({
          requirementId: 2,
          title: '요구사항 2',
          type: DependencyType.DEPENDS_ON,
        }),
      ]);
      expect(list.incoming).toEqual([
        expect.objectContaining({
          requirementId: 3,
          title: '요구사항 3',
          type: DependencyType.CONFLICTS_WITH,
        }),
      ]);
    });

    it('영향분석은 추적성 레코드(코드/문서/빌드/테스트)와 의존관계를 함께 반환한다', async () => {
      const { service } = makeService(
        [req(1), req(2)],
        [
          {
            requirementId: 1,
            linkedCodeFiles: ['src/login.ts'],
            linkedDocuments: ['SRS.md'],
            linkedBuilds: [42],
            linkedTests: ['login.spec.ts'],
          },
        ],
      );
      await service.create(1, {
        targetRequirementId: 2,
        type: DependencyType.DEPENDS_ON,
      });

      const impact = await service.getImpact(1);

      expect(impact.linkedCodeFiles).toEqual(['src/login.ts']);
      expect(impact.outgoingDependencies).toHaveLength(1);
    });

    it('추적성 레코드가 없으면 빈 배열을 반환한다', async () => {
      const { service } = makeService([req(1)]);

      const impact = await service.getImpact(1);

      expect(impact.linkedCodeFiles).toEqual([]);
      expect(impact.linkedDocuments).toEqual([]);
    });
  });
});
