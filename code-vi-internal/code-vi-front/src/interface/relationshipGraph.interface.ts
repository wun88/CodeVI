/**
 * 요구사항-코드 관계 그래프(RelationshipGraph) 뷰 모델.
 * 서버가 주는 평면 목록(MatchDetailItem[] — 파일/클래스/함수가 같은 레벨로 섞여 있다)을
 * "코드 파일 1건 + 그 안의 클래스/함수" 중첩 구조로 접은 형태다.
 * 변환은 utils/relationshipGraph.ts의 buildCodeMatchDetails가 담당한다.
 */

/** 유사도 구간별 연결 강도 — 선 색/굵기/실선 여부를 결정하는 단일 기준 */
export type ConnectionStrength = 'strong' | 'medium' | 'weak' | 'hidden';

/** 요구사항-코드 매핑 상태 — 그래프 노드 배지 및 상위 패널 연동용 */
export type CodeMatchStatus = 'linked' | 'partial' | 'missing';

/** 요구사항 하나에 매칭된 코드 파일 1건 */
export interface CodeMatchDetail {
  /**
   * 파일 식별자. AST 엔티티 id가 mapping-detail 응답에 실려 오지 않으므로 경로를 키로 쓴다
   * (같은 스냅샷 안에서 경로는 유일하다).
   */
  codeFileId: string;
  displayName: string;
  path: string;
  /** 0~1로 정규화한 유사도 — 서버의 0~100 정수를 100으로 나눈 값 */
  score: number;
  status: CodeMatchStatus;
  classes: string[];
  /** 점수 내림차순. 그래프는 상위 2개까지만 서브노드로 그린다. */
  functions: { name: string; score: number }[];
}
