export type RequirementType = 'functional' | 'non_functional';
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
/** 백엔드 requirement-status.enum.ts와 1:1 대응 (jej_23 Phase 8) */
export type RequirementStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'deprecated';

export interface Requirement {
  id: number;
  teamProjectId: number;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  status: RequirementStatus;
  ownerId: number | null;
  dueDate: string | null;
  version: string;
  baseline: string | null;
  acceptanceCriteria: string[];
  implementationScore: number;
  source: string | null;
  tags: string[] | null;
  relatedFeature: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequirementInput {
  teamProjectId: number;
  title: string;
  description?: string;
  type: RequirementType;
  priority?: RequirementPriority;
  dueDate?: string;
  source?: string;
  relatedFeature?: string;
  acceptanceCriteria?: string[];
  tags?: string[];
}

/** PATCH /api/requirements/:id 요청 바디 — 부분 수정 (jej_23 Phase 8) */
export interface UpdateRequirementInput {
  title?: string;
  description?: string;
  type?: RequirementType;
  priority?: RequirementPriority;
  dueDate?: string;
  source?: string;
  relatedFeature?: string;
  acceptanceCriteria?: string[];
  tags?: string[];
  status?: RequirementStatus;
  /** 승인(approved) 상태에서만 서버가 허용한다 */
  baseline?: string;
}

/** 요구사항 변경 이력 한 건 — 백엔드 RequirementVersion 엔티티와 1:1 대응 (jej_23 Phase 8) */
export interface RequirementVersion {
  id: number;
  requirementId: number;
  version: string;
  changedById: number | null;
  changeSummary: string;
  previousContent: string;
  currentContent: string;
  createdAt: string;
}

/** 백엔드 dependency-type.enum.ts와 1:1 대응 (jej_23 Phase 8) */
export type DependencyType =
  | 'depends_on'
  | 'related'
  | 'conflicts_with'
  | 'duplicates';

export interface DependencyItem {
  id: number;
  requirementId: number;
  title: string;
  type: DependencyType;
  createdAt: string;
}

/** `GET /api/requirements/:id/dependencies` 응답 (jej_23 Phase 8) */
export interface DependencyList {
  outgoing: DependencyItem[];
  incoming: DependencyItem[];
}

/** `GET /api/requirements/:id/impact` 응답 (jej_23 Phase 8) */
export interface ImpactAnalysis {
  requirementId: number;
  linkedCodeFiles: string[];
  linkedDocuments: string[];
  linkedBuilds: number[];
  linkedTests: string[];
  outgoingDependencies: DependencyItem[];
  incomingDependencies: DependencyItem[];
}

/** `GET /api/requirements/:id/mapping-detail` 항목 (jej_23 Phase 7 후속) */
export interface MatchDetailItem {
  type: 'file' | 'class' | 'function';
  name: string;
  path: string;
  /** 0~100 정수 */
  score: number;
}

/** 백엔드 AnalysisFinding 엔티티와 1:1 대응 (jej_20 Phase 6) */
export interface AnalysisFinding {
  id: number;
  teamProjectId: number;
  type: 'duplicate' | 'conflict' | 'omission' | 'ambiguity' | 'gap' | 'traceability_gap' | 'priority' | 'refinement' | 'test_recommendation' | 'quality';
  requirementIds: number[];
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  suggestedAction: string;
  aiExplanation: string | null;
  similarityScore: number | null;
  createdAt: string;
}

export interface DueDateAlert {
  requirementId: number;
  title: string;
  dueDate: string;
  urgency: 'overdue' | 'due_soon';
  dueInDays: number;
}

/** 백엔드 code-mapping-engine.ts의 MappingStatus와 1:1 대응 (jej_23 Phase 7) */
export type MappingStatus = 'implemented' | 'mostly' | 'partial' | 'unimplemented';

export interface MappingSummaryItem {
  requirementId: number;
  title: string;
  implementationScore: number;
  status: MappingStatus;
  /** top-5 매칭의 평균 유사도(0~1) */
  similarityAvg: number;
  matchCount: number;
  missingCount: number;
}

/** `GET /api/requirements/:teamProjectId/mapping-summary` 응답 (jej_23 Phase 7) */
export interface MappingSummary {
  total: number;
  mapped: number;
  requirements: MappingSummaryItem[];
}

export interface RequirementsSummary {
  total: number;
  functionalCount: number;
  nonFunctionalCount: number;
  priorityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  dueDateAlerts: DueDateAlert[];
  analysis: {
    duplicateCount: number;
    conflictCount: number;
    missingCount: number;
    totalFindings: number;
    recentFindings: AnalysisFinding[];
  };
}

/** 백엔드 document-type.enum.ts와 1:1 대응 (jej_23 Phase 9) */
export type DocumentType = 'srs' | 'prd' | 'brs';

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
}

/** 백엔드 GeneratedDocument 엔티티와 1:1 대응 (jej_23 Phase 9) */
export interface GeneratedDocument {
  id: number;
  teamProjectId: number;
  type: DocumentType;
  title: string;
  sections: DocumentSection[];
  sourceRequirementIds: number[];
  includeTraceability: boolean;
  includeNfr: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentQualityCheck {
  score: number;
  missingSections: string[];
  traceabilityIncluded: boolean;
  traceabilityCoverage: number;
  suggestions: string[];
}

/** `GET /api/requirements/:teamProjectId/build-history` 항목 (jej_23 Phase 10) */
export interface BuildHistoryItem {
  buildNumber: number;
  status: string;
  buildUrl: string;
  commitHash: string;
  createdAt: string;
  averageScore: number | null;
  scoreDelta: number | null;
}

export interface ChangedRequirement {
  requirementId: number;
  title: string;
  previousScore: number | null;
  currentScore: number;
}

/** `GET /api/requirements/:teamProjectId/build-history/:buildNumber` 응답 (jej_23 Phase 10) */
export interface BuildDetail {
  buildNumber: number;
  status: string;
  buildUrl: string;
  commitHash: string;
  createdAt: string;
  changedRequirements: ChangedRequirement[];
}

/** `GET /api/requirements/:teamProjectId/score-timeline` 항목 (jej_23 Phase 10) */
export interface ScoreSnapshot {
  requirementId: number;
  buildNumber: number | null;
  score: number;
  createdAt: string;
}

/** `GET /api/requirements/:teamProjectId/baselines` 항목 (jej_23 Phase 11) */
export interface BaselineSummaryItem {
  baseline: string;
  count: number;
}

/** `GET /api/requirements/:teamProjectId/activity` 항목 (jej_23 Phase 12) */
export interface RecentActivityItem {
  requirementId: number;
  requirementTitle: string;
  version: string;
  changeSummary: string;
  createdAt: string;
}
