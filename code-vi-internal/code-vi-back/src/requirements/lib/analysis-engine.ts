import { AnalysisFinding } from '../entities/analysis-finding.entity';
import { AnalysisFindingType } from '../entities/analysis-finding-type.enum';
import { AnalysisSeverity } from '../entities/analysis-severity.enum';
import { Requirement } from '../entities/requirement.entity';

/**
 * ReqFlow(requirements-management-system) server/services/recompute.ts::buildAnalysisFindings 이식.
 * 요구사항 텍스트끼리의 토큰 overlap/키워드 조합만 보는 순수 휴리스틱 — 코드/Jenkins와 전혀 무관해
 * jej_20 Phase 6에서 매핑 엔진(Phase 7, 실제 AST 데이터 필요)보다 먼저 이식했다.
 *
 * 누락(omission) 탐지는 ReqFlow의 인증 데모 전용 키워드(AUTH_FLOW_KEYWORDS)가 하드코딩돼 있어
 * 실제 프로젝트에서는 구조적으로 오탐만 생성했다 — PR #61 리뷰 #13에 따라 삭제했다. 실제 코드
 * 매핑(Phase 7) 이후 진짜 신호에 기반한 누락 탐지로 다시 설계해야 한다.
 */

const DUPLICATE_THRESHOLD = 0.55;
const DUPLICATE_HIGH_SEVERITY_THRESHOLD = 0.8;

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function overlapScore(aTokens: Set<string>, bTokens: Set<string>): number {
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1;
  });
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function requirementText(requirement: Requirement): string {
  return [
    requirement.title,
    requirement.description,
    ...requirement.acceptanceCriteria,
  ].join(' ');
}

function isConflictingPair(left: Requirement, right: Requirement): boolean {
  const pairText =
    `${requirementText(left)} ${requirementText(right)}`.toLowerCase();
  return (
    (pairText.includes('자동 로그인') && pairText.includes('재인증')) ||
    (pairText.includes('무제한') && pairText.includes('타임아웃')) ||
    (pairText.includes('권한') && pairText.includes('공개')) ||
    (pairText.includes('보안') && pairText.includes('자동 로그인'))
  );
}

type NewFinding = Omit<
  AnalysisFinding,
  | keyof import('../../common/entities/common.entity').CommonEntity
  | 'teamProject'
>;

/** 요구사항 집합에서 중복/충돌 findings를 계산한다 (DB에 저장하지 않는 순수 함수). */
export function buildAnalysisFindings(
  teamProjectId: number,
  requirements: Requirement[],
): NewFinding[] {
  const findings: NewFinding[] = [];

  // 쌍(i, j)마다 requirementText()+tokenize()를 재계산하면 O(n²) 루프 안에서 매번 문자열
  // 처리가 반복된다(PR #61 리뷰 #17) — 요구사항당 토큰 Set을 루프 진입 전에 한 번만 만든다.
  const tokensByRequirement = requirements.map(
    (requirement) => new Set(tokenize(requirementText(requirement))),
  );

  for (let i = 0; i < requirements.length; i += 1) {
    for (let j = i + 1; j < requirements.length; j += 1) {
      const left = requirements[i];
      const right = requirements[j];
      const sim = overlapScore(tokensByRequirement[i], tokensByRequirement[j]);

      if (sim >= DUPLICATE_THRESHOLD) {
        findings.push({
          teamProjectId,
          type: AnalysisFindingType.DUPLICATE,
          requirementIds: [left.id, right.id],
          description: `"${left.title}"와(과) "${right.title}"가 기능 설명과 수용 기준에서 높은 중복도를 보입니다.`,
          severity:
            sim >= DUPLICATE_HIGH_SEVERITY_THRESHOLD
              ? AnalysisSeverity.HIGH
              : AnalysisSeverity.MEDIUM,
          confidence: Math.min(0.97, Math.max(0.65, sim)),
          suggestedAction: `"${right.title}"를 "${left.title}"에 병합하거나 중복 범위를 조정하세요.`,
          aiExplanation: `제목/설명 유사도 ${sim.toFixed(2)}로 중복 후보로 분류했습니다.`,
          similarityScore: Math.round(sim * 100) / 100,
        });
      }

      if (isConflictingPair(left, right)) {
        findings.push({
          teamProjectId,
          type: AnalysisFindingType.CONFLICT,
          requirementIds: [left.id, right.id],
          description: `"${left.title}"와(과) "${right.title}"가 보안/세션/권한 정책에서 상충 가능성이 있습니다.`,
          severity: AnalysisSeverity.HIGH,
          confidence: 0.84,
          suggestedAction:
            '정책 우선순위를 명확히 하고 상충 조건을 정리하세요.',
          aiExplanation:
            '보안, 자동 로그인, 세션, 권한 관련 키워드 조합을 기준으로 충돌 후보를 생성했습니다.',
          similarityScore: null,
        });
      }
    }
  }

  return findings;
}

const SEVERITY_RANK: Record<AnalysisSeverity, number> = {
  [AnalysisSeverity.CRITICAL]: 0,
  [AnalysisSeverity.HIGH]: 1,
  [AnalysisSeverity.MEDIUM]: 2,
  [AnalysisSeverity.LOW]: 3,
};

/**
 * findings를 severity(critical→low) 우선, 동률이면 confidence 내림차순으로 정렬한다.
 * recomputeFindings가 findings 전량을 같은 시각에 insert하므로 `createdAt DESC` 정렬은
 * 타임스탬프가 전부 동일해 비결정적이다 — recentFindings.slice(0, 5)가 호출마다 다른 5건을
 * 반환할 수 있었다(PR #61 리뷰 #18).
 */
export function sortFindingsBySeverity<
  T extends Pick<AnalysisFinding, 'severity' | 'confidence'>,
>(findings: T[]): T[] {
  return [...findings].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return b.confidence - a.confidence;
  });
}
