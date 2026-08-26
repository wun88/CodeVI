/**
 * `GET /api/requirements/:teamProjectId/baselines` 응답 (jej_23 Phase 11, "설정" 탭).
 * 별도 Baseline 엔티티(jej_20 Phase 2, 요구사항 집합 스냅샷) 대신 실제로 채워지고 있는
 * Requirement.baseline 문자열 필드(승인 상태에서만 지정 가능, jej_23 Phase 8)를 집계한다 —
 * Baseline 엔티티는 아직 이를 채우는 생성 플로우가 없어 항상 빈 배열만 반환하기 때문이다.
 */
export interface BaselineSummaryItemDto {
  baseline: string;
  count: number;
}
