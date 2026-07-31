import { RequirementStatus } from '../entities/requirement-status.enum';

/** ReqFlow src/utils/requirement.ts::getDueDateUrgency/getDueInDays 이식 (jej_20 Phase 6) */
export type DueDateUrgency = 'overdue' | 'due_soon' | 'normal' | 'done';

const DUE_SOON_WINDOW_DAYS = 3;

export function getDueInDays(dueDate: string): number {
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function getDueDateUrgency(
  dueDate: string,
  status?: RequirementStatus,
): DueDateUrgency {
  if (status === RequirementStatus.DEPRECATED) return 'done';

  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 'normal';

  const diffDays = getDueInDays(dueDate);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= DUE_SOON_WINDOW_DAYS) return 'due_soon';
  return 'normal';
}
