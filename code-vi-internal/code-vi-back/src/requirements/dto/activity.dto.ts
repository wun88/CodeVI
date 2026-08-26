/**
 * `GET /api/requirements/:teamProjectId/activity` 항목 (jej_23 Phase 12).
 * ReqFlow 원본처럼 별도 activity 테이블을 새로 만들지 않고, RequirementVersion(jej_23 Phase 8,
 * 내용 변경마다 자동 기록됨) 생성 시점을 그대로 활동 로그로 재사용한다.
 */
export interface RecentActivityItemDto {
  requirementId: number;
  requirementTitle: string;
  version: string;
  changeSummary: string;
  createdAt: Date;
}
