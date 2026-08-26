import type { MappingStatus } from '../lib/code-mapping-engine';

export interface MappingSummaryItemDto {
  requirementId: number;
  title: string;
  implementationScore: number;
  status: MappingStatus;
  /** top-5 매칭의 평균 overlapScore(0~1) — ValidationDetail이 아직 없으면 0 */
  similarityAvg: number;
  matchCount: number;
  missingCount: number;
}

/** `GET /api/requirements/:teamProjectId/mapping-summary` 응답 (jej_23 Phase 7) */
export interface MappingSummaryDto {
  total: number;
  mapped: number;
  requirements: MappingSummaryItemDto[];
}

/** `POST /api/requirements/:teamProjectId/mapping/recompute` 응답 */
export interface MappingRecomputeResultDto {
  total: number;
  mapped: number;
}
