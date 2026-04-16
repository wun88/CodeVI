/** 대시보드 overview — AstSnapshot에서 파생 */

export type MetricStatus = 'danger' | 'maintain' | 'good' | 'excellent';

export interface AstSummaryBlock {
  fileCount: number;
  functionCount: number;
  astNodeCount: number;
  avgFunctionLoc: number;
  analysisSeconds: number;
}

export interface QualityMetricCardData {
  id: string;
  title: string;
  description: string;
  score: number;
  maxScore: number;
  status: MetricStatus;
  accent: 'rose' | 'amber' | 'sky' | 'emerald';
}

export interface RadarAxisData {
  subject: string;
  fullMark: number;
  value: number;
  /** 짧은 설명 — 레이더 범례·툴팁에 사용 */
  hint: string;
}

/** 리팩토링 카드 상단 상태 — 위험 / 개선 필요 / 양호 */
export type RefactoringSeverity = 'risk' | 'improve' | 'clear';

export interface RefactoringSuggestion {
  id: string;
  targetLabel: string;
  /** 한 줄 핵심 문제 */
  problemSummary: string;
  problemCode: string;
  improvedCode: string;
  /** 개선 효과 요약 */
  effectSummary: string;
  /** 상세 설명 */
  detailExplanation: string;
  /** 문제 심각도 — UI 배지 */
  severity: RefactoringSeverity;
  /** 개선 효과 문장에서 강조할 짧은 구절 */
  effectHighlights: string[];
}

export interface SnapshotOverview {
  snapshotId: number;
  teamProjectId: number;
  analyzedAt: string;
  qualityScore: number;
  qualityHint: string;
  astSummary: AstSummaryBlock;
  metricCards: QualityMetricCardData[];
  radarAxes: RadarAxisData[];
  refactorings: RefactoringSuggestion[];
}
