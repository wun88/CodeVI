/** `GET /api/requirements/:teamProjectId/build-history` 항목 하나 (jej_23 Phase 10) */
export interface BuildHistoryItemDto {
  buildNumber: number;
  status: string;
  buildUrl: string;
  commitHash: string;
  createdAt: Date;
  /** 이 빌드 시점 요구사항 implementationScore 평균 — 스냅샷이 없으면(과거 빌드) null */
  averageScore: number | null;
  /** 직전 빌드 대비 평균 점수 증감 */
  scoreDelta: number | null;
}

export interface ChangedRequirementDto {
  requirementId: number;
  title: string;
  previousScore: number | null;
  currentScore: number;
}

/** `GET /api/requirements/:teamProjectId/build-history/:buildNumber` 응답 */
export interface BuildDetailDto {
  buildNumber: number;
  status: string;
  buildUrl: string;
  commitHash: string;
  createdAt: Date;
  changedRequirements: ChangedRequirementDto[];
}

/** `GET /api/requirements/:teamProjectId/score-timeline` 항목 하나 */
export interface ScoreSnapshotDto {
  requirementId: number;
  buildNumber: number | null;
  score: number;
  createdAt: Date;
}
