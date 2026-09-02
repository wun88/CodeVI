import type { FlowResult, FlowNodeData } from '../interface/flow.interface';
import type { AstSmell } from '../interface/ast.interface';

/**
 * PyExamine smell finding을 AST 구조 그래프 노드에 매핑하고,
 * 디렉토리 롤업 집계와 품질 점수를 계산한다.
 *
 * 점수 공식(1차 잠정): 파일 = max(0, 100 - high×10 - medium×3),
 * 디렉토리 = 하위 전체 파일 점수 평균, 전체 = 모든 파일 평균.
 */

export type SmellSeverity = 'high' | 'medium';

export interface SmellFinding {
  name: string;
  severity: SmellSeverity;
  filePath: string;
  lineStart?: number | null;
  lineEnd?: number | null;
  entity?: string | null;
}

export interface NodeSmells {
  high: number;
  medium: number;
  total: number;
  names: string[];
}

export interface SmellOverlay {
  smellsByNodeId: Map<string, NodeSmells>;
  scoreByNodeId: Map<string, number>;
  overallScore: number;
  total: number;
  high: number;
  medium: number;
  /** filePath 매핑에 실패한 finding 수 — 화면에 노출해서 조용히 사라지지 않게 한다 */
  unmatched: number;
}

/**
 * 스냅샷 응답에 실려 온 pyexamine 스멜을 오버레이 입력 형태로 변환한다.
 * lineNumber 0은 파일/모듈 단위 스멜(아키텍처 스멜 등)이라 라인 정보 없음으로 넘겨
 * entity 매칭을 이름 기준(관대한 매칭)으로 떨어뜨린다.
 */
export function toSmellFindings(smells: AstSmell[]): SmellFinding[] {
  return smells.map((s) => ({
    name: s.name,
    severity: s.severity?.toLowerCase() === 'high' ? 'high' : 'medium',
    // Jenkins가 os.walk('.')로 zip을 만들어 분석기 입력 경로에 './' 접두가 붙을 수 있다
    filePath: s.file.replace(/^\.\//, ''),
    lineStart: s.lineNumber > 0 ? s.lineNumber : null,
    lineEnd: null,
    entity: s['Module/Class'] || null,
  }));
}

const HIGH_PENALTY = 10;
const MEDIUM_PENALTY = 3;

function fileScore(smells: NodeSmells | undefined): number {
  if (!smells) return 100;
  return Math.max(0, 100 - smells.high * HIGH_PENALTY - smells.medium * MEDIUM_PENALTY);
}

/** 라인 범위가 겹치면 true. 어느 한쪽 정보가 없으면 이름 일치만으로 허용(관대한 매칭) */
function lineOverlaps(
  nodeStart?: number,
  nodeEnd?: number,
  findStart?: number | null,
  findEnd?: number | null
): boolean {
  if (nodeStart == null || findStart == null) return true;
  const nEnd = nodeEnd ?? nodeStart;
  const fEnd = findEnd ?? findStart;
  return nodeStart <= fEnd && nEnd >= findStart;
}

export function computeSmellOverlay(graph: FlowResult, findings: SmellFinding[]): SmellOverlay {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const parentMap = new Map<string, string>();
  const childrenMap = new Map<string, string[]>();
  graph.edges.forEach((e) => {
    if (e.edgeType !== 'hierarchy') return;
    parentMap.set(e.target, e.source);
    const arr = childrenMap.get(e.source);
    if (arr) arr.push(e.target);
    else childrenMap.set(e.source, [e.target]);
  });

  const fileIdByPath = new Map<string, string>();
  graph.nodes.forEach((n) => {
    const d = n.data as FlowNodeData;
    if (d.nodeType === 'file' && d.meta?.fullPath) fileIdByPath.set(d.meta.fullPath, n.id);
  });
  const allPaths = [...fileIdByPath.keys()];

  const smellsByNodeId = new Map<string, NodeSmells>();
  const addSmell = (id: string, f: SmellFinding) => {
    let s = smellsByNodeId.get(id);
    if (!s) {
      s = { high: 0, medium: 0, total: 0, names: [] };
      smellsByNodeId.set(id, s);
    }
    s[f.severity] += 1;
    s.total += 1;
    if (!s.names.includes(f.name)) s.names.push(f.name);
  };

  /** 파일 하위의 클래스·함수 노드 id 전부 (entity 매칭용) */
  const descendantsOfFile = (fileId: string): string[] => {
    const out: string[] = [];
    const stack = [...(childrenMap.get(fileId) ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      out.push(id);
      (childrenMap.get(id) ?? []).forEach((c) => stack.push(c));
    }
    return out;
  };

  let unmatched = 0;
  let high = 0;
  let medium = 0;

  findings.forEach((f) => {
    if (f.severity === 'high') high += 1;
    else medium += 1;

    // 1) 파일 매칭: 정확 일치 → suffix 폴백 (analyzer 컨테이너 경로 prefix가 다를 수 있음)
    //    '/' 경계 없는 endsWith는 오탐(my_foo/a.py ↔ foo/a.py)이므로 경계를 강제하고,
    //    동명 파일이 여러 디렉토리에 걸리면 어느 쪽인지 알 수 없으므로 unmatched로 처리한다.
    let fileId = fileIdByPath.get(f.filePath);
    if (!fileId) {
      const hits = allPaths.filter(
        (p) => p.endsWith(`/${f.filePath}`) || f.filePath.endsWith(`/${p}`)
      );
      if (hits.length === 1) fileId = fileIdByPath.get(hits[0]);
    }
    if (!fileId) {
      unmatched += 1;
      return;
    }
    addSmell(fileId, f);

    // 2) entity 매칭: 같은 파일 안에서 이름 일치 + 라인 범위 겹침
    if (f.entity) {
      const target = descendantsOfFile(fileId).find((id) => {
        const d = nodeById.get(id)?.data as FlowNodeData | undefined;
        if (!d || d.label !== f.entity) return false;
        return lineOverlaps(d.meta?.startLine, d.meta?.endLine, f.lineStart, f.lineEnd);
      });
      if (target) addSmell(target, f);
    }

    // 3) 조상 디렉토리 롤업
    let cur = parentMap.get(fileId);
    while (cur) {
      addSmell(cur, f);
      cur = parentMap.get(cur);
    }
  });

  // 점수 계산
  const scoreByNodeId = new Map<string, number>();
  graph.nodes.forEach((n) => {
    if (n.id.startsWith('file-')) scoreByNodeId.set(n.id, fileScore(smellsByNodeId.get(n.id)));
  });

  const statsCache = new Map<string, { sum: number; count: number }>();
  const fileStats = (dirId: string): { sum: number; count: number } => {
    const cached = statsCache.get(dirId);
    if (cached) return cached;
    let sum = 0;
    let count = 0;
    (childrenMap.get(dirId) ?? []).forEach((cid) => {
      if (cid.startsWith('file-')) {
        sum += scoreByNodeId.get(cid) ?? 100;
        count += 1;
      } else if (cid.startsWith('dir-')) {
        const st = fileStats(cid);
        sum += st.sum;
        count += st.count;
      }
    });
    const result = { sum, count };
    statsCache.set(dirId, result);
    return result;
  };

  graph.nodes.forEach((n) => {
    if (!n.id.startsWith('dir-')) return;
    const st = fileStats(n.id);
    if (st.count > 0) scoreByNodeId.set(n.id, Math.round(st.sum / st.count));
  });

  let sum = 0;
  let count = 0;
  scoreByNodeId.forEach((score, id) => {
    if (id.startsWith('file-')) {
      sum += score;
      count += 1;
    }
  });

  return {
    smellsByNodeId,
    scoreByNodeId,
    overallScore: count ? Math.round(sum / count) : 100,
    total: findings.length,
    high,
    medium,
    unmatched,
  };
}
