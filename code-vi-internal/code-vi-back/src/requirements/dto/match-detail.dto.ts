/**
 * `GET /api/requirements/:id/mapping-detail` 항목 (jej_23 Phase 7 후속).
 * ValidationDetail.matches(Phase 7이 recomputeForTeamProject마다 저장하는 top-5 매칭)를
 * 그대로 노출한다 — 지금까지는 matchCount/missingCount 집계 숫자로만 보여주고 개별 매칭
 * 항목(파일/클래스/함수명·경로·점수)은 API로 노출한 적이 없었다.
 */
export interface MatchDetailItemDto {
  type: 'file' | 'class' | 'function';
  name: string;
  path: string;
  /** 0~100 정수로 반올림한 유사도 점수 */
  score: number;
}
