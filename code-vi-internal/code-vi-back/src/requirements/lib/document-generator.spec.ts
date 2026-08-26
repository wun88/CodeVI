import {
  computeQualityCheck,
  generateDocumentSections,
  TraceabilityLookup,
} from './document-generator';
import { DocumentType } from '../entities/document-type.enum';
import { RequirementType } from '../entities/requirement-type.enum';
import { RequirementPriority } from '../entities/requirement-priority.enum';

type Requirement = import('../entities/requirement.entity').Requirement;

function req(overrides: Partial<Requirement>): Requirement {
  return {
    id: 1,
    teamProjectId: 1,
    title: '요구사항',
    description: '',
    type: RequirementType.FUNCTIONAL,
    priority: RequirementPriority.MEDIUM,
    acceptanceCriteria: [],
    implementationScore: 0,
    ...overrides,
  } as Requirement;
}

describe('document-generator (jej_23 Phase 9)', () => {
  describe('generateDocumentSections', () => {
    it('SRS는 10개 섹션을 생성하고 기능/비기능 요구사항을 분류해 채운다', () => {
      const requirements = [
        req({ id: 1, title: '로그인', type: RequirementType.FUNCTIONAL }),
        req({
          id: 2,
          title: '응답 속도',
          type: RequirementType.NON_FUNCTIONAL,
        }),
      ];

      const { title, sections } = generateDocumentSections(
        DocumentType.SRS,
        '테스트 프로젝트',
        requirements,
        { includeTraceability: true, includeNfr: true },
        new Map(),
      );

      expect(title).toBe('Software Requirements Specification');
      expect(sections).toHaveLength(10);
      const functional = sections.find((s) => s.id === 'functional');
      expect(functional?.content).toContain('로그인');
      const nfr = sections.find((s) => s.id === 'nfr');
      expect(nfr?.content).toContain('응답 속도');
    });

    it('includeNfr=false면 비기능 요구사항 섹션이 미포함 문구로 대체된다', () => {
      const requirements = [
        req({
          id: 1,
          title: '응답 속도',
          type: RequirementType.NON_FUNCTIONAL,
        }),
      ];

      const { sections } = generateDocumentSections(
        DocumentType.SRS,
        '테스트 프로젝트',
        requirements,
        { includeTraceability: true, includeNfr: false },
        new Map(),
      );

      const nfr = sections.find((s) => s.id === 'nfr');
      expect(nfr?.content).toBe('_비기능 요구사항 미포함_');
    });

    it('includeTraceability=false면 추적성 매트릭스가 미포함 문구로 대체된다', () => {
      const { sections } = generateDocumentSections(
        DocumentType.SRS,
        '테스트 프로젝트',
        [req({ id: 1 })],
        { includeTraceability: false, includeNfr: true },
        new Map(),
      );

      const traceability = sections.find((s) => s.id === 'traceability');
      expect(traceability?.content).toContain('미포함');
    });

    it('추적성 매트릭스는 실제 TraceabilityRecord 연결 여부(코드/테스트)를 반영한다', () => {
      const lookup: TraceabilityLookup = new Map([
        [1, { hasCode: true, hasTest: false }],
      ]);

      const { sections } = generateDocumentSections(
        DocumentType.SRS,
        '테스트 프로젝트',
        [req({ id: 1, title: '로그인' })],
        { includeTraceability: true, includeNfr: true },
        lookup,
      );

      const traceability = sections.find((s) => s.id === 'traceability');
      expect(traceability?.content).toContain('| #1 | 로그인 | ✓ | — |');
    });

    it('PRD는 7개 섹션을 생성하고 핵심 기능은 기능 요구사항 상위 5개만 담는다', () => {
      const requirements = Array.from({ length: 7 }, (_, i) =>
        req({
          id: i + 1,
          title: `기능 ${i + 1}`,
          type: RequirementType.FUNCTIONAL,
        }),
      );

      const { title, sections } = generateDocumentSections(
        DocumentType.PRD,
        '테스트 프로젝트',
        requirements,
        { includeTraceability: true, includeNfr: true },
        new Map(),
      );

      expect(title).toBe('Product Requirements Document');
      expect(sections).toHaveLength(7);
      const features = sections.find((s) => s.id === 'features');
      expect(features?.content).toContain('기능 1');
      expect(features?.content).not.toContain('기능 6');
    });

    it('BRS는 7개 섹션을 생성하고 업무 요구사항 섹션에 전체 요구사항을 담는다', () => {
      const requirements = [
        req({ id: 1, title: '요구사항A' }),
        req({ id: 2, title: '요구사항B' }),
      ];

      const { title, sections } = generateDocumentSections(
        DocumentType.BRS,
        '테스트 프로젝트',
        requirements,
        { includeTraceability: true, includeNfr: true },
        new Map(),
      );

      expect(title).toBe('Business Requirements Specification');
      expect(sections).toHaveLength(7);
      const businessReq = sections.find((s) => s.id === 'business-req');
      expect(businessReq?.content).toContain('요구사항A');
      expect(businessReq?.content).toContain('요구사항B');
    });
  });

  describe('computeQualityCheck', () => {
    it('모든 섹션이 있으면 score 100, 누락 섹션 없음', () => {
      const { sections } = generateDocumentSections(
        DocumentType.SRS,
        '테스트 프로젝트',
        [req({ id: 1 })],
        { includeTraceability: true, includeNfr: true },
        new Map(),
      );

      const quality = computeQualityCheck(
        DocumentType.SRS,
        sections,
        [1],
        new Map(),
      );

      expect(quality.score).toBe(100);
      expect(quality.missingSections).toEqual([]);
    });

    it('섹션이 누락되면 score가 낮아지고 missingSections에 표시된다', () => {
      const { sections } = generateDocumentSections(
        DocumentType.SRS,
        '테스트 프로젝트',
        [req({ id: 1 })],
        { includeTraceability: true, includeNfr: true },
        new Map(),
      );
      const partial = sections.slice(0, 5);

      const quality = computeQualityCheck(
        DocumentType.SRS,
        partial,
        [1],
        new Map(),
      );

      expect(quality.score).toBe(50);
      expect(quality.missingSections.length).toBe(5);
    });

    it('추적성 매트릭스 미포함이면 traceabilityIncluded=false, coverage=0', () => {
      const { sections } = generateDocumentSections(
        DocumentType.SRS,
        '테스트 프로젝트',
        [req({ id: 1 })],
        { includeTraceability: false, includeNfr: true },
        new Map(),
      );

      const quality = computeQualityCheck(
        DocumentType.SRS,
        sections,
        [1],
        new Map(),
      );

      expect(quality.traceabilityIncluded).toBe(false);
      expect(quality.traceabilityCoverage).toBe(0);
    });

    it('추적성 매트릭스가 포함되면 실제 코드 연결 비율로 coverage를 계산한다', () => {
      const lookup: TraceabilityLookup = new Map([
        [1, { hasCode: true, hasTest: true }],
        [2, { hasCode: false, hasTest: false }],
      ]);
      const { sections } = generateDocumentSections(
        DocumentType.SRS,
        '테스트 프로젝트',
        [req({ id: 1 }), req({ id: 2 })],
        { includeTraceability: true, includeNfr: true },
        lookup,
      );

      const quality = computeQualityCheck(
        DocumentType.SRS,
        sections,
        [1, 2],
        lookup,
      );

      expect(quality.traceabilityIncluded).toBe(true);
      expect(quality.traceabilityCoverage).toBe(50);
    });
  });
});
