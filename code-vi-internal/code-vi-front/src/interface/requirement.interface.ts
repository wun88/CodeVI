export type RequirementType = 'functional' | 'non_functional';
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Requirement {
  id: number;
  teamProjectId: number;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  status: string;
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
