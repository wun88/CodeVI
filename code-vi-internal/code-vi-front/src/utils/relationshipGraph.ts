import type { MatchDetailItem } from '../interface/requirement.interface';
import type {
  CodeMatchDetail,
  CodeMatchStatus,
  ConnectionStrength,
} from '../interface/relationshipGraph.interface';

/** 이 점수 미만은 노이즈로 보고 그래프에서 숨긴다 */
export const CONNECTION_MIN_SCORE = 0.4;
/** 이 점수 이상이면 '보통' 연결 */
export const CONNECTION_MEDIUM_SCORE = 0.7;
/** 이 점수 이상이면 '강함' 연결 */
export const CONNECTION_STRONG_SCORE = 0.85;

/**
 * 유사도(0~1)를 연결 강도로 환산한다.
 * @param score 0~1 정규화 유사도
 */
export function getConnectionStrength(score: number): ConnectionStrength {
  if (score < CONNECTION_MIN_SCORE) return 'hidden';
  if (score >= CONNECTION_STRONG_SCORE) return 'strong';
  if (score >= CONNECTION_MEDIUM_SCORE) return 'medium';
  return 'weak';
}

/**
 * 연결 강도별 선 굵기(px). hidden은 렌더링되지 않으므로 0이다.
 * @param strength getConnectionStrength의 결과
 */
export function getConnectionStrokeWidth(strength: ConnectionStrength): number {
  const widths: Record<ConnectionStrength, number> = {
    strong: 3,
    medium: 2,
    weak: 1,
    hidden: 0,
  };
  return widths[strength];
}

/**
 * 연결 강도별 색. 인터널 테마가 이미 쓰고 있는 4단 점수 팔레트를 그대로 가져왔다 —
 * StatusDistributionDonut의 STATUS_COLOR, OverallProgressRing의 A/B/C/D 등급과 같은 색이고
 * 임계값(85/70)까지 등급 구간과 일치한다. 대시보드 어디서 봐도 "85% 이상은 민트"가 성립한다.
 */
export const CONNECTION_COLORS: Record<ConnectionStrength, string> = {
  strong: 'rgba(110, 231, 183, 0.92)',
  medium: 'rgba(159, 231, 240, 0.92)',
  weak: 'rgba(251, 191, 36, 0.92)',
  hidden: 'rgba(235, 245, 251, 0.18)',
};

/**
 * 유사도별 선 색상.
 * @param score 0~1 정규화 유사도
 */
export function getConnectionColor(score: number): string {
  return CONNECTION_COLORS[getConnectionStrength(score)];
}

/**
 * 연결 강도에 따른 대시 패턴. 약한 연결만 점선으로 그려 확신도가 낮음을 드러낸다.
 * @param strength getConnectionStrength의 결과
 */
export function getConnectionDashArray(
  strength: ConnectionStrength,
): string | undefined {
  return strength === 'weak' ? '4 4' : undefined;
}

/**
 * 경로에서 파일명만 떼어낸다. 서버가 file 타입 항목을 top-5 안에 포함시키지 못한
 * 경우(클래스/함수만 매칭된 경우) 표시 이름을 만들기 위한 폴백이다.
 * @param path 디렉토리 체인을 이어붙인 파일 경로
 */
function basename(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

/**
 * 파일 점수를 매핑 상태로 환산한다. mapping-detail 응답에는 상태 필드가 없어
 * 연결 강도와 같은 임계값으로 파생시킨다.
 * @param score 0~1 정규화 유사도
 */
function toStatus(score: number): CodeMatchStatus {
  if (score >= CONNECTION_STRONG_SCORE) return 'linked';
  if (score >= CONNECTION_MIN_SCORE) return 'partial';
  return 'missing';
}

/**
 * 서버의 평면 매칭 목록을 그래프용 파일 단위 중첩 구조로 접는다.
 * 클래스/함수 항목도 자기가 속한 파일 경로를 path에 담고 있어(code-mapping.service.ts)
 * path를 그룹 키로 쓸 수 있다. 결과는 파일 점수 내림차순.
 * @param items GET /api/requirements/:id/mapping-detail 응답 (score 0~100 정수)
 */
export function buildCodeMatchDetails(
  items: MatchDetailItem[],
): CodeMatchDetail[] {
  const groups = new Map<string, MatchDetailItem[]>();
  for (const item of items) {
    const group = groups.get(item.path);
    if (group) group.push(item);
    else groups.set(item.path, [item]);
  }

  return [...groups.entries()]
    .map(([path, group]): CodeMatchDetail => {
      const fileItem = group.find((item) => item.type === 'file');
      // top-5로 잘리면서 file 항목 자체가 빠질 수 있다 — 하위 요소 최고점으로 대신한다.
      const score =
        (fileItem?.score ?? Math.max(...group.map((item) => item.score))) / 100;

      return {
        codeFileId: path,
        displayName: fileItem?.name ?? basename(path),
        path,
        score,
        status: toStatus(score),
        classes: group
          .filter((item) => item.type === 'class')
          .map((item) => item.name),
        functions: group
          .filter((item) => item.type === 'function')
          .map((item) => ({ name: item.name, score: item.score / 100 }))
          .sort((a, b) => b.score - a.score),
      };
    })
    .sort((a, b) => b.score - a.score);
}
