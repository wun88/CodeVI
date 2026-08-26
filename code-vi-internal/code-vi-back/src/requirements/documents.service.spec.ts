import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DocumentsService } from './documents.service';
import { DocumentType } from './entities/document-type.enum';
import { RequirementType } from './entities/requirement-type.enum';
import { RequirementPriority } from './entities/requirement-priority.enum';

type Requirement = import('./entities/requirement.entity').Requirement;
type GeneratedDocument =
  import('./entities/generated-document.entity').GeneratedDocument;
type TraceabilityRecord =
  import('./entities/traceability-record.entity').TraceabilityRecord;
type TeamProject =
  import('../team-project/entities/team-project.entity').TeamProject;

describe('DocumentsService (jej_23 Phase 9)', () => {
  const makeService = (
    requirements: Partial<Requirement>[],
    teamProject: Partial<TeamProject> | null,
    traceabilityRecords: Partial<TraceabilityRecord>[] = [],
  ) => {
    const requirementRepository = {
      find: jest.fn(
        async ({ where }: { where: { id: { value: number[] } } }) => {
          const ids = (where.id as unknown as { value: number[] }).value;
          return requirements.filter((r) => ids.includes(r.id as number));
        },
      ),
    } as unknown as Repository<Requirement>;

    let saved: Partial<GeneratedDocument>[] = [];
    const documentRepository = {
      create: jest.fn((plain: Partial<GeneratedDocument>) => plain),
      save: jest.fn(async (entity: Partial<GeneratedDocument>) => {
        if (entity.id) {
          saved = saved.map((d) => (d.id === entity.id ? entity : d));
          return entity;
        }
        const withId = { id: saved.length + 1, ...entity };
        saved.push(withId);
        return withId;
      }),
      find: jest.fn(async ({ where }: { where: { teamProjectId: number } }) =>
        saved.filter((d) => d.teamProjectId === where.teamProjectId),
      ),
      findOne: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          saved.find((d) =>
            Object.entries(where).every(
              ([key, value]) => (d as Record<string, unknown>)[key] === value,
            ),
          ) ?? null,
      ),
    } as unknown as Repository<GeneratedDocument>;

    const traceabilityRecordRepository = {
      find: jest.fn(async () => traceabilityRecords),
    } as unknown as Repository<TraceabilityRecord>;

    const teamProjectRepository = {
      findOne: jest.fn(async () => teamProject),
    } as unknown as Repository<TeamProject>;

    return {
      service: new DocumentsService(
        documentRepository,
        requirementRepository,
        traceabilityRecordRepository,
        teamProjectRepository,
      ),
      documentRepository,
    };
  };

  const req = (
    id: number,
    overrides: Partial<Requirement> = {},
  ): Partial<Requirement> => ({
    id,
    teamProjectId: 1,
    title: `요구사항 ${id}`,
    description: '',
    type: RequirementType.FUNCTIONAL,
    priority: RequirementPriority.MEDIUM,
    acceptanceCriteria: [],
    implementationScore: 0,
    ...overrides,
  });

  describe('generate', () => {
    it('프로젝트가 없으면 NotFoundException', async () => {
      const { service } = makeService([], null);
      await expect(
        service.generate(1, { type: DocumentType.SRS, requirementIds: [1] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('선택한 요구사항이 하나도 없으면 BadRequestException', async () => {
      const { service } = makeService([req(1)], { id: 1, teamName: '테스트' });
      await expect(
        service.generate(1, { type: DocumentType.SRS, requirementIds: [999] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('정상 생성하면 title/sections/sourceRequirementIds가 채워진다', async () => {
      const { service } = makeService(
        [
          req(1, { title: '로그인' }),
          req(2, { title: '응답 속도', type: RequirementType.NON_FUNCTIONAL }),
        ],
        { id: 1, teamName: '테스트 프로젝트' },
      );

      const document = await service.generate(1, {
        type: DocumentType.SRS,
        requirementIds: [1, 2],
      });

      expect(document.title).toBe('Software Requirements Specification');
      expect(document.sections).toHaveLength(10);
      expect(document.sourceRequirementIds).toEqual([1, 2]);
      expect(document.includeTraceability).toBe(true);
      expect(document.includeNfr).toBe(true);
    });
  });

  describe('updateSection', () => {
    it('다른 프로젝트 소속 문서를 수정하려 하면 NotFoundException', async () => {
      const { service } = makeService([req(1)], { id: 1, teamName: '테스트' });
      const document = await service.generate(1, {
        type: DocumentType.SRS,
        requirementIds: [1],
      });

      await expect(
        service.updateSection(999, document.id, 'overview', '수정됨'),
      ).rejects.toThrow(NotFoundException);
    });

    it('존재하지 않는 섹션이면 NotFoundException', async () => {
      const { service } = makeService([req(1)], { id: 1, teamName: '테스트' });
      const document = await service.generate(1, {
        type: DocumentType.SRS,
        requirementIds: [1],
      });

      await expect(
        service.updateSection(1, document.id, 'not-exist', '수정됨'),
      ).rejects.toThrow(NotFoundException);
    });

    it('정상 수정하면 해당 섹션 content만 바뀐다', async () => {
      const { service } = makeService([req(1)], { id: 1, teamName: '테스트' });
      const document = await service.generate(1, {
        type: DocumentType.SRS,
        requirementIds: [1],
      });

      const updated = await service.updateSection(
        1,
        document.id,
        'overview',
        '직접 작성한 개요',
      );

      const overview = updated.sections.find((s) => s.id === 'overview');
      expect(overview?.content).toBe('직접 작성한 개요');
      const purpose = updated.sections.find((s) => s.id === 'purpose');
      expect(purpose?.content).toBe(
        document.sections.find((s) => s.id === 'purpose')?.content,
      );
    });
  });

  describe('regenerateSection', () => {
    it('현재 요구사항 데이터로 해당 섹션만 다시 계산한다', async () => {
      const { service } = makeService([req(1, { title: '로그인' })], {
        id: 1,
        teamName: '테스트',
      });
      const document = await service.generate(1, {
        type: DocumentType.SRS,
        requirementIds: [1],
      });
      await service.updateSection(
        1,
        document.id,
        'overview',
        '수동으로 편집한 내용',
      );

      const regenerated = await service.regenerateSection(
        1,
        document.id,
        'overview',
      );

      const overview = regenerated.sections.find((s) => s.id === 'overview');
      expect(overview?.content).not.toBe('수동으로 편집한 내용');
      expect(overview?.content).toContain('테스트');
    });
  });

  describe('getQualityCheck', () => {
    it('생성 직후 문서는 score 100이다', async () => {
      const { service } = makeService([req(1)], { id: 1, teamName: '테스트' });
      const document = await service.generate(1, {
        type: DocumentType.SRS,
        requirementIds: [1],
      });

      const quality = await service.getQualityCheck(1, document.id);

      expect(quality.score).toBe(100);
    });
  });
});
