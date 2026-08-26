import { RequirementStatus } from '../entities/requirement-status.enum';

/**
 * 요구사항 상태 전이 그래프 (jej_23 Phase 8, ReqFlow 원본 워크플로 이식).
 * 초안 → 리뷰 → 승인/반려 → 폐기. 승인/반려 상태에서는 재검토를 위해 리뷰로 되돌릴 수 있다.
 */
const STATUS_TRANSITIONS: Record<RequirementStatus, RequirementStatus[]> = {
  [RequirementStatus.DRAFT]: [RequirementStatus.IN_REVIEW],
  [RequirementStatus.IN_REVIEW]: [
    RequirementStatus.APPROVED,
    RequirementStatus.REJECTED,
  ],
  [RequirementStatus.APPROVED]: [
    RequirementStatus.DEPRECATED,
    RequirementStatus.IN_REVIEW,
  ],
  [RequirementStatus.REJECTED]: [RequirementStatus.IN_REVIEW],
  [RequirementStatus.DEPRECATED]: [],
};

/** 같은 상태로의 "전이"(변경 없음)는 항상 허용한다. */
export function isValidStatusTransition(
  from: RequirementStatus,
  to: RequirementStatus,
): boolean {
  if (from === to) return true;
  return STATUS_TRANSITIONS[from].includes(to);
}
