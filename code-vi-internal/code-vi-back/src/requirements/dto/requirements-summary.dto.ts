import { AnalysisFinding } from '../entities/analysis-finding.entity';

export interface DueDateAlert {
  requirementId: number;
  title: string;
  dueDate: string;
  urgency: 'overdue' | 'due_soon';
  dueInDays: number;
}

export interface PriorityDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AnalysisSummary {
  duplicateCount: number;
  conflictCount: number;
  missingCount: number;
  totalFindings: number;
  recentFindings: AnalysisFinding[];
}

/** `/projects/:id` 대시보드 섹션이 한 번의 호출로 그려지도록 묶은 응답 (jej_20 Phase 6) */
export interface RequirementsSummaryDto {
  total: number;
  functionalCount: number;
  nonFunctionalCount: number;
  priorityDistribution: PriorityDistribution;
  dueDateAlerts: DueDateAlert[];
  analysis: AnalysisSummary;
}
