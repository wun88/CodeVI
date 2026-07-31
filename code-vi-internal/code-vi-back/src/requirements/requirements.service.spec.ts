import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { AnalysisFindingType } from './entities/analysis-finding-type.enum';
import { RequirementStatus } from './entities/requirement-status.enum';

type Requirement = import('./entities/requirement.entity').Requirement;
type AnalysisFinding =
  import('./entities/analysis-finding.entity').AnalysisFinding;

// 프로젝트 멤버십 검증은 ProjectMemberGuard(jej_22 인가 가드 통합)로 옮겨졌다 — 그 동작은
// project-member.guard.spec.ts에서 검증하고, 여기서는 서비스 본연의 데이터 처리만 검증한다.
describe('RequirementsService', () => {
  const makeService = () => {
    let saved: Partial<Requirement>[] = [];
    const requirementRepository = {
      create: jest.fn((plain: Partial<Requirement>) => plain),
      save: jest.fn(async (entity: Partial<Requirement>) => {
        if (entity.id) {
          saved = saved.map((r) => (r.id === entity.id ? entity : r));
          return entity;
        }
        const withId = { id: saved.length + 1, ...entity };
        saved.push(withId);
        return withId;
      }),
      find: jest.fn(async (options: { where: { teamProjectId: number } }) =>
        saved.filter((r) => r.teamProjectId === options.where.teamProjectId),
      ),
      findOne: jest.fn(
        async ({ where }: { where: { id: number } }) =>
          saved.find((r) => r.id === where.id) ?? null,
      ),
    } as unknown as Repository<Requirement>;

    let savedFindings: Partial<AnalysisFinding>[] = [];
    const analysisFindingRepository = {
      find: jest.fn(async (options: { where: { teamProjectId: number } }) =>
        savedFindings.filter(
          (f) => f.teamProjectId === options.where.teamProjectId,
        ),
      ),
    } as unknown as Repository<AnalysisFinding>;

    // recomputeFindings/remove의 delete(+save)는 트랜잭션 매니저를 통해 실행되므로
    // (requirements.service.ts), analysisFindingRepository/requirementRepository가 아니라 이
    // mock manager가 실제로 saved/savedFindings를 갱신한다. 두 번째 인자의 모양(배열=id 목록,
    // 숫자=단일 id, 객체=조건)으로 대상 엔티티를 구분한다 — 실제 코드의 호출 형태와 1:1 대응.
    const dataSource = {
      transaction: jest.fn(async (cb: (manager: any) => Promise<void>) => {
        const manager = {
          delete: jest.fn(async (_entity: unknown, criteria: unknown) => {
            if (Array.isArray(criteria)) {
              savedFindings = savedFindings.filter(
                (f) => !criteria.includes(f.id),
              );
              return;
            }
            if (typeof criteria === 'number') {
              saved = saved.filter((r) => r.id !== criteria);
              return;
            }
            const { teamProjectId } = criteria as { teamProjectId: number };
            savedFindings = savedFindings.filter(
              (f) => f.teamProjectId !== teamProjectId,
            );
          }),
          create: jest.fn(
            (_entity: unknown, plain: Record<string, unknown>) => plain,
          ),
          // createBulk(Requirement)/recomputeFindings(AnalysisFinding)가 같은 manager.save를
          // 공유하므로, 저장할 필드 모양(requirementIds 유무)으로 대상 배열을 구분한다.
          save: jest.fn(async (entities: Record<string, unknown>[]) => {
            if (entities.length > 0 && 'requirementIds' in entities[0]) {
              const withIds = entities.map((entity, i) => ({
                id: savedFindings.length + i + 1,
                ...entity,
              })) as Partial<AnalysisFinding>[];
              savedFindings.push(...withIds);
              return withIds;
            }
            const withIds = entities.map((entity, i) => ({
              id: saved.length + i + 1,
              ...entity,
            })) as Partial<Requirement>[];
            saved.push(...withIds);
            return withIds;
          }),
        };
        return cb(manager);
      }),
    } as unknown as DataSource;

    return {
      service: new RequirementsService(
        dataSource,
        requirementRepository,
        analysisFindingRepository,
      ),
      requirementRepository,
      analysisFindingRepository,
      dataSource,
    };
  };

  it('생략된 필드는 기본값(priority=medium, description/acceptanceCriteria 빈 값)으로 채워 생성한다', async () => {
    const { service } = makeService();
    const dto: CreateRequirementDto = {
      teamProjectId: 1,
      title: '로그인 기능',
      type: 'functional' as CreateRequirementDto['type'],
    };

    const created = await service.create(dto);

    expect(created.teamProjectId).toBe(1);
    expect(created.title).toBe('로그인 기능');
    expect(created.description).toBe('');
    expect(created.priority).toBe('medium');
    expect(created.ownerId).toBeNull();
    expect(created.acceptanceCriteria).toEqual([]);
  });

  it('teamProjectId로 필터링해 해당 프로젝트의 요구사항만 반환한다', async () => {
    const { service } = makeService();
    await service.create({
      teamProjectId: 1,
      title: '프로젝트1 요구사항',
      type: 'functional' as CreateRequirementDto['type'],
    });
    await service.create({
      teamProjectId: 2,
      title: '프로젝트2 요구사항',
      type: 'functional' as CreateRequirementDto['type'],
    });

    const list = await service.findByTeamProject(1);

    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('프로젝트1 요구사항');
  });

  describe('update / remove (PR #61 리뷰 #5, #19)', () => {
    it('일부 필드만 담긴 dto로 부분 수정하고, 지정하지 않은 필드는 그대로 둔다', async () => {
      const { service } = makeService();
      const created = await service.create({
        teamProjectId: 1,
        title: '로그인 기능',
        type: 'functional' as CreateRequirementDto['type'],
      });

      const updated = await service.update(created.id, {
        status: RequirementStatus.APPROVED,
      });

      expect(updated.status).toBe(RequirementStatus.APPROVED);
      expect(updated.title).toBe('로그인 기능');
    });

    it('존재하지 않는 id를 수정하려 하면 NotFoundException', async () => {
      const { service } = makeService();
      await expect(
        service.update(999, { status: RequirementStatus.APPROVED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('삭제하면 목록에서 사라지고, 존재하지 않는 id를 삭제하려 하면 NotFoundException', async () => {
      const { service } = makeService();
      const created = await service.create({
        teamProjectId: 1,
        title: '로그인 기능',
        type: 'functional' as CreateRequirementDto['type'],
      });

      await service.remove(created.id);

      const list = await service.findByTeamProject(1);
      expect(list).toHaveLength(0);
      await expect(service.remove(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('삭제된 요구사항을 참조하던 finding(dangling id)도 함께 삭제한다', async () => {
      const { service, analysisFindingRepository } = makeService();
      const first = await service.create({
        teamProjectId: 1,
        title: '사용자 로그인 기능 구현',
        type: 'functional' as CreateRequirementDto['type'],
      });
      const second = await service.create({
        teamProjectId: 1,
        title: '사용자 로그인 기능 구현',
        type: 'functional' as CreateRequirementDto['type'],
      });
      await service.recomputeFindings(1);

      const beforeRemoval = await analysisFindingRepository.find({
        where: { teamProjectId: 1 },
      });
      expect(
        beforeRemoval.some((f) => f.type === AnalysisFindingType.DUPLICATE),
      ).toBe(true);

      await service.remove(second.id);

      const afterRemoval = await analysisFindingRepository.find({
        where: { teamProjectId: 1 },
      });
      expect(
        afterRemoval.some((f) => f.requirementIds?.includes(second.id)),
      ).toBe(false);
      // 남은 요구사항(first)만 언급하는 finding까지 전부 지워지진 않았는지는 요구하지 않는다 —
      // 이번 케이스는 duplicate 쌍이라 둘 다 사라지는 게 맞다.
      void first;
    });
  });

  describe('createBulk (PR #61 리뷰 #6)', () => {
    it('전부 성공하면 successCount만큼 저장되고 failureCount는 0이다', async () => {
      const { service } = makeService();

      const result = await service.createBulk({
        teamProjectId: 1,
        items: [
          { title: 'CSV 요구사항 1', type: 'functional' } as never,
          { title: 'CSV 요구사항 2', type: 'functional' } as never,
          { title: 'CSV 요구사항 3', type: 'non_functional' } as never,
        ],
      });

      expect(result).toEqual({ successCount: 3, failureCount: 0, errors: [] });
      const list = await service.findByTeamProject(1);
      expect(list).toHaveLength(3);
    });

    it('트랜잭션 중 오류가 나면 전부 실패로 반환하고 아무 것도 저장하지 않는다(부분 저장 없음)', async () => {
      const { service, dataSource } = makeService();
      (dataSource.transaction as jest.Mock).mockRejectedValueOnce(
        new Error('DB 오류'),
      );

      const result = await service.createBulk({
        teamProjectId: 1,
        items: [
          { title: 'CSV 요구사항 1', type: 'functional' } as never,
          { title: 'CSV 요구사항 2', type: 'functional' } as never,
        ],
      });

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
      expect(result.errors).toEqual(['DB 오류']);
      const list = await service.findByTeamProject(1);
      expect(list).toHaveLength(0);
    });
  });

  describe('recomputeFindings / getSummary (jej_20 Phase 6)', () => {
    it('제목이 거의 같은 요구사항 2개가 있으면 duplicate finding을 생성한다', async () => {
      const { service } = makeService();
      await service.create({
        teamProjectId: 1,
        title: '사용자 로그인 기능 구현',
        type: 'functional' as CreateRequirementDto['type'],
      });
      await service.create({
        teamProjectId: 1,
        title: '사용자 로그인 기능 구현',
        type: 'functional' as CreateRequirementDto['type'],
      });

      const findings = await service.recomputeFindings(1);

      expect(
        findings.some((f) => f.type === AnalysisFindingType.DUPLICATE),
      ).toBe(true);
    });

    it('재계산 시 이전 findings를 새 결과로 교체한다', async () => {
      const { service, analysisFindingRepository, dataSource } = makeService();
      await service.create({
        teamProjectId: 1,
        title: '사용자 로그인 기능 구현',
        type: 'functional' as CreateRequirementDto['type'],
      });
      await service.create({
        teamProjectId: 1,
        title: '사용자 로그인 기능 구현',
        type: 'functional' as CreateRequirementDto['type'],
      });

      await service.recomputeFindings(1);
      await service.recomputeFindings(1);

      expect(dataSource.transaction).toHaveBeenCalledTimes(2);
      const remaining = await analysisFindingRepository.find({
        where: { teamProjectId: 1 },
      });
      expect(remaining.length).toBeGreaterThan(0);
    });

    it('전체 개수/우선순위 분포/마감 알림/분석 요약을 정확히 집계한다', async () => {
      const { service } = makeService();
      const today = new Date();
      const overdue = new Date(today.getTime() - 5 * 86400000)
        .toISOString()
        .slice(0, 10);
      const farFuture = new Date(today.getTime() + 60 * 86400000)
        .toISOString()
        .slice(0, 10);

      await service.create({
        teamProjectId: 1,
        title: '마감 지난 요구사항',
        type: 'functional' as CreateRequirementDto['type'],
        priority: 'critical' as CreateRequirementDto['priority'],
        dueDate: overdue,
      });
      await service.create({
        teamProjectId: 1,
        title: '한참 남은 요구사항',
        type: 'non_functional' as CreateRequirementDto['type'],
        priority: 'low' as CreateRequirementDto['priority'],
        dueDate: farFuture,
      });

      const summary = await service.getSummary(1);

      expect(summary.total).toBe(2);
      expect(summary.functionalCount).toBe(1);
      expect(summary.nonFunctionalCount).toBe(1);
      expect(summary.priorityDistribution.critical).toBe(1);
      expect(summary.priorityDistribution.low).toBe(1);
      expect(summary.dueDateAlerts).toHaveLength(1);
      expect(summary.dueDateAlerts[0].urgency).toBe('overdue');
      expect(summary.analysis.totalFindings).toBe(0);
    });
  });
});
