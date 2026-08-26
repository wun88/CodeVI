import { Requirement } from '../entities/requirement.entity';
import { DocumentType } from '../entities/document-type.enum';
import { RequirementType } from '../entities/requirement-type.enum';

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
}

export interface DocumentQualityCheck {
  score: number;
  missingSections: string[];
  traceabilityIncluded: boolean;
  traceabilityCoverage: number;
  suggestions: string[];
}

export interface GenerateDocumentOptions {
  includeTraceability: boolean;
  includeNfr: boolean;
}

/** requirementId → 코드/테스트 연결 여부 (TraceabilityRecord 기반, jej_23 Phase 7 산출물) */
export type TraceabilityLookup = Map<
  number,
  { hasCode: boolean; hasTest: boolean }
>;

/**
 * ReqFlow(requirements-management-system) src/mocks/documentGenerator.ts 이식 (jej_23 Phase 9).
 * 원본은 특정 데모 회사("Enterprise User Portal")를 가정한 고정 서술 텍스트가 섞여 있었다 — 실제
 * 요구사항 데이터로 계산 가능한 섹션(기능/비기능 목록, 수용 기준, 추적성 매트릭스, 업무 요구사항 등)은
 * 그대로 계산해서 채우고, 데이터로 유도할 수 없는 서술형 섹션(시스템 개요, 제약사항 등)은 프로젝트명만
 * 반영한 뒤 "직접 작성해주세요" 플레이스홀더로 대체한다 — 어차피 섹션 편집(PATCH)이 가능하므로 이 쪽이
 * 가짜 사실을 실제 프로젝트 문서인 것처럼 보여주는 것보다 정직하다.
 */
const PLACEHOLDER = '_이 섹션은 프로젝트에 맞게 직접 작성해주세요._';

const SRS_SECTION_TITLES = [
  '시스템 개요',
  '목적',
  '범위',
  '기능 요구사항',
  '비기능 요구사항',
  '시스템 제약사항',
  '외부 인터페이스',
  '데이터 요구사항',
  '수용 기준',
  '추적성 매트릭스',
];

const PRD_SECTION_TITLES = [
  '제품 목표',
  '사용자 문제',
  '대상 사용자',
  '핵심 기능',
  '사용자 시나리오',
  '성공 지표',
  '릴리즈 범위',
];

const BRS_SECTION_TITLES = [
  '비즈니스 목표',
  '이해관계자',
  '업무 요구사항',
  '기대 효과',
  '프로젝트 범위',
  '제약사항',
  '리스크',
];

function sectionTitlesFor(type: DocumentType): string[] {
  if (type === DocumentType.SRS) return SRS_SECTION_TITLES;
  if (type === DocumentType.PRD) return PRD_SECTION_TITLES;
  return BRS_SECTION_TITLES;
}

function formatReqList(reqs: Requirement[]): string {
  if (reqs.length === 0) return '_해당하는 요구사항이 없습니다._';
  return reqs
    .map((r) => `- **#${r.id}** ${r.title} (${r.priority})`)
    .join('\n');
}

function formatAcceptanceCriteria(reqs: Requirement[]): string {
  const lines = reqs.flatMap((r) =>
    r.acceptanceCriteria.map((c) => `- [#${r.id}] ${c}`),
  );
  return lines.length > 0 ? lines.join('\n') : '_등록된 수용 기준이 없습니다._';
}

function formatTraceabilityMatrix(
  reqs: Requirement[],
  traceability: TraceabilityLookup,
): string {
  if (reqs.length === 0) return '_해당하는 요구사항이 없습니다._';
  const rows = reqs.map((r) => {
    const link = traceability.get(r.id);
    return `| #${r.id} | ${r.title} | ${link?.hasCode ? '✓' : '—'} | ${link?.hasTest ? '✓' : '—'} |`;
  });
  return [
    '| ID | 제목 | 코드 | 테스트 |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function averageImplementationScore(requirements: Requirement[]): number {
  if (requirements.length === 0) return 0;
  const sum = requirements.reduce((acc, r) => acc + r.implementationScore, 0);
  return Math.round(sum / requirements.length);
}

export function generateDocumentSections(
  type: DocumentType,
  teamName: string,
  requirements: Requirement[],
  options: GenerateDocumentOptions,
  traceability: TraceabilityLookup,
): { title: string; sections: DocumentSection[] } {
  const functional = requirements.filter(
    (r) => r.type === RequirementType.FUNCTIONAL,
  );
  const nfr = requirements.filter(
    (r) => r.type === RequirementType.NON_FUNCTIONAL,
  );

  if (type === DocumentType.SRS) {
    return {
      title: 'Software Requirements Specification',
      sections: [
        {
          id: 'overview',
          title: '시스템 개요',
          content: `${teamName} 프로젝트의 요구사항을 기반으로 생성된 문서입니다.\n\n${PLACEHOLDER}`,
        },
        {
          id: 'purpose',
          title: '목적',
          content: `본 문서는 ${teamName}의 기능·비기능 요구사항을 정의하여 개발·검증·추적성 관리의 기준을 제공합니다.`,
        },
        {
          id: 'scope',
          title: '범위',
          content: `포함: 기능 요구사항 ${functional.length}건, 비기능 요구사항 ${nfr.length}건.\n\n${PLACEHOLDER}`,
        },
        {
          id: 'functional',
          title: '기능 요구사항',
          content: formatReqList(functional),
        },
        {
          id: 'nfr',
          title: '비기능 요구사항',
          content: options.includeNfr
            ? formatReqList(nfr)
            : '_비기능 요구사항 미포함_',
        },
        { id: 'constraints', title: '시스템 제약사항', content: PLACEHOLDER },
        { id: 'interfaces', title: '외부 인터페이스', content: PLACEHOLDER },
        { id: 'data', title: '데이터 요구사항', content: PLACEHOLDER },
        {
          id: 'acceptance',
          title: '수용 기준',
          content: formatAcceptanceCriteria(requirements),
        },
        {
          id: 'traceability',
          title: '추적성 매트릭스',
          content: options.includeTraceability
            ? formatTraceabilityMatrix(requirements, traceability)
            : '_추적성 매트릭스 미포함 — 생성 옵션에서 활성화하세요._',
        },
      ],
    };
  }

  if (type === DocumentType.PRD) {
    return {
      title: 'Product Requirements Document',
      sections: [
        {
          id: 'goals',
          title: '제품 목표',
          content: `${teamName}의 제품 목표를 정의합니다.\n\n${PLACEHOLDER}`,
        },
        { id: 'problems', title: '사용자 문제', content: PLACEHOLDER },
        { id: 'users', title: '대상 사용자', content: PLACEHOLDER },
        {
          id: 'features',
          title: '핵심 기능',
          content: formatReqList(functional.slice(0, 5)),
        },
        { id: 'scenarios', title: '사용자 시나리오', content: PLACEHOLDER },
        {
          id: 'metrics',
          title: '성공 지표',
          content: `- 요구사항 평균 구현률 ${averageImplementationScore(requirements)}%\n\n${PLACEHOLDER}`,
        },
        {
          id: 'release',
          title: '릴리즈 범위',
          content:
            requirements.length > 0
              ? `v1.0: ${requirements
                  .slice(0, 6)
                  .map((r) => `#${r.id}`)
                  .join(', ')}\nv1.1: ${
                  requirements
                    .slice(6)
                    .map((r) => `#${r.id}`)
                    .join(', ') || 'TBD'
                }`
              : '_해당하는 요구사항이 없습니다._',
        },
      ],
    };
  }

  return {
    title: 'Business Requirements Specification',
    sections: [
      { id: 'biz-goals', title: '비즈니스 목표', content: PLACEHOLDER },
      {
        id: 'stakeholders',
        title: '이해관계자',
        content:
          '- 제품 오너 (Product Owner)\n- 개발팀 (Engineering)\n- QA팀\n- 최종 사용자',
      },
      {
        id: 'business-req',
        title: '업무 요구사항',
        content: formatReqList(requirements),
      },
      { id: 'benefits', title: '기대 효과', content: PLACEHOLDER },
      {
        id: 'scope',
        title: '프로젝트 범위',
        content: `${teamName} 프로젝트의 요구사항 ${requirements.length}건을 대상으로 합니다.`,
      },
      { id: 'constraints', title: '제약사항', content: PLACEHOLDER },
      { id: 'risks', title: '리스크', content: PLACEHOLDER },
    ],
  };
}

/** ReqFlow의 runQualityCheck 이식 — traceabilityCoverage는 고정값(85) 대신 실제 TraceabilityRecord로 계산한다. */
export function computeQualityCheck(
  type: DocumentType,
  sections: DocumentSection[],
  sourceRequirementIds: number[],
  traceability: TraceabilityLookup,
): DocumentQualityCheck {
  const expectedSections = sectionTitlesFor(type);
  const presentTitles = sections.map((s) => s.title);
  const missing = expectedSections.filter((s) => !presentTitles.includes(s));
  const traceSection = sections.find((s) => s.title.includes('추적성'));
  const traceabilityIncluded = Boolean(
    traceSection && !traceSection.content.includes('미포함'),
  );

  const coveredCount = sourceRequirementIds.filter(
    (id) => traceability.get(id)?.hasCode,
  ).length;
  const traceabilityCoverage =
    traceabilityIncluded && sourceRequirementIds.length > 0
      ? Math.round((coveredCount / sourceRequirementIds.length) * 100)
      : 0;

  const score = Math.round(
    ((expectedSections.length - missing.length) / expectedSections.length) *
      100,
  );

  return {
    score,
    missingSections: missing,
    traceabilityIncluded,
    traceabilityCoverage,
    suggestions: [
      ...(missing.length > 0 ? [`누락 섹션: ${missing.join(', ')}`] : []),
      ...(!traceabilityIncluded && type === DocumentType.SRS
        ? ['추적성 매트릭스를 포함하세요.']
        : []),
      ...(score < 80
        ? ['일부 섹션 내용을 보강하세요.']
        : ['문서 품질이 양호합니다.']),
    ],
  };
}
