/** 요구사항 워크플로우 상태 — 구현 진척(implementationScore)과는 별개 개념 */
export enum RequirementStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DEPRECATED = 'deprecated',
}
