import type { AstFlowNode, AstFlowEdge } from '../interface/flow.interface';

/* AstNode.module.css의 타입별 max-width와 결합 — CSS 폭을 바꾸면 여기도 함께 갱신.
   실제 렌더 폭은 min~max 사이에서 내용에 따라 달라지므로 max 기준으로 잡아 겹침을 막는다. */
const NODE_WIDTH: Record<string, number> = {
  directory: 260,
  file: 240,
  class: 230,
  function: 200,
};
const DEFAULT_NODE_WIDTH = 240;

/* 한 줄(기본 행) 기준 근사 높이 — 스멜 뱃지·score 태그 등으로 행이 늘면 V_GAP이 흡수한다 */
const NODE_HEIGHT: Record<string, number> = {
  directory: 48,
  file: 44,
  class: 52,
  function: 40,
};

const H_GAP = 40;
const V_GAP = 64;

interface SubtreeBox {
  width: number;
  height: number;
  place: (x: number, y: number) => void;
}

/**
 * 자식들을 여러 줄로 감싸는(wrap) 계층 트리 레이아웃.
 *
 * dagre TB는 형제를 전부 한 줄에 나열해서 fan-out이 큰 디렉토리 트리가
 * 극단적으로 가로로 길어진다(수천 px 폭의 한 줄 스트립). 여기서는 각 노드의
 * 자식 블록을 ~정사각형에 가까운 여러 줄 그리드로 감싸 화면 비율을 유지한다.
 */
export function applyWrappedTreeLayout(
  nodes: AstFlowNode[],
  edges: AstFlowEdge[]
): { nodes: AstFlowNode[]; edges: AstFlowEdge[] } {
  const positions = new Map<string, { x: number; y: number }>();
  const childrenMap = new Map<string, string[]>();
  const hasParent = new Set<string>();
  const ids = new Set(nodes.map((n) => n.id));

  edges.forEach((e) => {
    if (e.edgeType !== 'hierarchy' || !ids.has(e.source) || !ids.has(e.target)) return;
    const arr = childrenMap.get(e.source);
    if (arr) arr.push(e.target);
    else childrenMap.set(e.source, [e.target]);
    hasParent.add(e.target);
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  function layoutSubtree(id: string): SubtreeBox {
    const node = nodeById.get(id)!;
    const ownWidth = NODE_WIDTH[node.data.nodeType] ?? DEFAULT_NODE_WIDTH;
    const ownHeight = NODE_HEIGHT[node.data.nodeType] ?? 44;
    const childIds = childrenMap.get(id) ?? [];

    if (!childIds.length) {
      return {
        width: ownWidth,
        height: ownHeight,
        place: (x, y) => positions.set(id, { x, y }),
      };
    }

    const boxes = childIds.map(layoutSubtree);
    // 폭 기준 greedy 줄바꿈: 자식 블록 폭이 제각각이어도 블록 비율이 ≈2.4:1이 되도록
    const totalWidth =
      boxes.reduce((acc, b) => acc + b.width, 0) + H_GAP * (boxes.length - 1);
    const avgHeight = boxes.reduce((acc, b) => acc + b.height, 0) / boxes.length;
    const idealRows = Math.max(1, Math.round(Math.sqrt(totalWidth / (2.4 * (avgHeight + V_GAP)))));
    const maxRowWidth = Math.max(
      Math.max(...boxes.map((b) => b.width)),
      Math.ceil(totalWidth / idealRows)
    );
    const rows: SubtreeBox[][] = [];
    let currentRow: SubtreeBox[] = [];
    let currentWidth = 0;
    boxes.forEach((b) => {
      const nextWidth = currentRow.length ? currentWidth + H_GAP + b.width : b.width;
      if (currentRow.length && nextWidth > maxRowWidth) {
        rows.push(currentRow);
        currentRow = [b];
        currentWidth = b.width;
      } else {
        currentRow.push(b);
        currentWidth = nextWidth;
      }
    });
    if (currentRow.length) rows.push(currentRow);

    const rowWidth = (row: SubtreeBox[]) =>
      row.reduce((acc, b) => acc + b.width, 0) + H_GAP * (row.length - 1);
    const rowHeight = (row: SubtreeBox[]) => Math.max(...row.map((b) => b.height));

    const blockWidth = Math.max(ownWidth, ...rows.map(rowWidth));
    const childrenHeight =
      rows.reduce((acc, r) => acc + rowHeight(r), 0) + V_GAP * (rows.length - 1);

    return {
      width: blockWidth,
      height: ownHeight + V_GAP + childrenHeight,
      place: (x, y) => {
        positions.set(id, { x: x + blockWidth / 2 - ownWidth / 2, y });
        let cy = y + ownHeight + V_GAP;
        rows.forEach((row) => {
          let cx = x + (blockWidth - rowWidth(row)) / 2;
          row.forEach((b) => {
            b.place(cx, cy);
            cx += b.width + H_GAP;
          });
          cy += rowHeight(row) + V_GAP;
        });
      },
    };
  }

  const roots = nodes.filter((n) => !hasParent.has(n.id));
  let cursorX = 0;
  roots.forEach((root) => {
    const box = layoutSubtree(root.id);
    box.place(cursorX, 0);
    cursorX += box.width + H_GAP * 3;
  });

  return {
    nodes: nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? { x: 0, y: 0 } })),
    edges,
  };
}
