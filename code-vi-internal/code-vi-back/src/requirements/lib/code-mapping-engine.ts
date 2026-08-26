import { Requirement } from '../entities/requirement.entity';
import { tokenize } from './analysis-engine';

/**
 * 요구사항-코드 자동 매핑 엔진 (jej_23 Phase 7). ReqFlow의 calculateEstimatedScore
 * (Top-5 유사도평균×100×0.6 + 수용기준 구현률×100×0.4)를 실제 AstFile/AstClass/AstFunction과
 * 비교하도록 재설계했다 — analysis-engine.ts의 tokenize를 재사용하되, 비교 대상이 자연어 문장이
 * 아니라 짧은 코드 식별자(camelCase/snake_case)라 별도 토큰화(tokenizeIdentifier)를 둔다.
 */

const TOP_N = 5;
const SIMILARITY_WEIGHT = 0.6;
const ACCEPTANCE_WEIGHT = 0.4;
// 식별자는 요구사항 문장보다 훨씬 짧아 overlapScore 절대값이 낮게 나온다(예: 토큰 10개짜리 문장과
// 토큰 2개짜리 식별자가 1개 겹치면 1/10=0.1) — 요구사항 쌍 비교(DUPLICATE_THRESHOLD=0.55)보다
// 낮은 임계값을 쓴다. 실사용 데이터로 튜닝이 필요할 수 있는 1차 추정치.
const ACCEPTANCE_MATCH_THRESHOLD = 0.15;

export type MappingStatus =
  | 'implemented'
  | 'mostly'
  | 'partial'
  | 'unimplemented';

export function getMappingStatus(score: number): MappingStatus {
  if (score >= 80) return 'implemented';
  if (score >= 50) return 'mostly';
  if (score > 0) return 'partial';
  return 'unimplemented';
}

export interface CodeCandidate {
  type: 'file' | 'class' | 'function';
  id: number;
  name: string;
  /** 표시용 파일 경로(디렉토리 체인을 이어붙인 것) — file 타입이면 자기 자신의 경로. */
  path: string;
}

export interface CandidateMatch extends CodeCandidate {
  score: number;
}

export interface AcceptanceCriterionStatus {
  criterion: string;
  matched: boolean;
}

export interface RequirementMappingResult {
  requirementId: number;
  /** 0~100 정수 */
  implementationScore: number;
  /** 0~1 — top-5 매칭의 평균 overlapScore */
  similarityAvg: number;
  matches: CandidateMatch[];
  acceptanceCriteriaStatus: AcceptanceCriterionStatus[];
  missingLogic: string[];
  aiExplanation: string;
}

function overlapScore(aTokens: Set<string>, bTokens: Set<string>): number {
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1;
  });
  return overlap / Math.max(aTokens.size, bTokens.size);
}

/** camelCase/snake_case/kebab-case 식별자를 사람이 읽는 단어 단위로 쪼갠 뒤 tokenize한다. */
function tokenizeIdentifier(name: string): Set<string> {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]/g, ' ');
  return new Set(tokenize(spaced));
}

function requirementTokens(requirement: Requirement): Set<string> {
  return new Set(
    tokenize([requirement.title, requirement.description].join(' ')),
  );
}

/** 요구사항 1건을 코드 후보 전체와 비교해 구현 점수/매칭/수용기준 충족 여부를 계산한다(순수 함수). */
export function computeRequirementMapping(
  requirement: Requirement,
  candidates: CodeCandidate[],
): RequirementMappingResult {
  const reqTokens = requirementTokens(requirement);

  const scored: CandidateMatch[] = candidates
    .map((candidate) => ({
      ...candidate,
      score: overlapScore(reqTokens, tokenizeIdentifier(candidate.name)),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const matches = scored.slice(0, TOP_N);
  const similarityAvg =
    matches.length > 0
      ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length
      : 0;

  const acceptanceCriteriaStatus: AcceptanceCriterionStatus[] =
    requirement.acceptanceCriteria.map((criterion) => {
      const criterionTokens = new Set(tokenize(criterion));
      const matched = candidates.some(
        (c) =>
          overlapScore(criterionTokens, tokenizeIdentifier(c.name)) >=
          ACCEPTANCE_MATCH_THRESHOLD,
      );
      return { criterion, matched };
    });

  // 수용기준이 아예 없으면 0.4 가중치를 강제로 0점 처리하는 대신 유사도로 대체한다
  // (수용기준 미기재가 곧 미구현을 의미하지는 않으므로 가중치 왜곡을 피함).
  const hasCriteria = acceptanceCriteriaStatus.length > 0;
  const acceptanceRate = hasCriteria
    ? acceptanceCriteriaStatus.filter((s) => s.matched).length /
      acceptanceCriteriaStatus.length
    : similarityAvg;

  const implementationScore = Math.round(
    similarityAvg * 100 * SIMILARITY_WEIGHT +
      acceptanceRate * 100 * ACCEPTANCE_WEIGHT,
  );

  const matchedCriteriaCount = acceptanceCriteriaStatus.filter(
    (s) => s.matched,
  ).length;
  const aiExplanation =
    matches.length > 0
      ? `${matches.length}개 코드 요소와 매칭됨(평균 유사도 ${Math.round(similarityAvg * 100)}%)` +
        (hasCriteria
          ? `, 수용기준 ${matchedCriteriaCount}/${acceptanceCriteriaStatus.length}건 충족 추정.`
          : '.')
      : '매칭되는 코드 요소를 찾지 못했습니다.';

  return {
    requirementId: requirement.id,
    implementationScore,
    similarityAvg,
    matches,
    acceptanceCriteriaStatus,
    missingLogic: acceptanceCriteriaStatus
      .filter((s) => !s.matched)
      .map((s) => s.criterion),
    aiExplanation,
  };
}
