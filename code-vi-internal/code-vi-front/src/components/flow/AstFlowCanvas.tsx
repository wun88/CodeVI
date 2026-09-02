import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type ReactFlowInstance,
  type NodeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AstNode from './AstNode';
import type { AstSnapshot } from '../../interface/ast.interface';
import type { FlowNodeData } from '../../interface/flow.interface';
import type { AstFlowEdge } from '../../interface/flow.interface';
import { astSnapshotToFlow } from '../../utils/astToFlow';
import { applyWrappedTreeLayout } from '../../utils/treeLayout';
import { computeSmellOverlay, type SmellFinding } from '../../utils/smellOverlay';
import styles from './AstFlowCanvas.module.css';

const nodeTypes: NodeTypes = {
  astNode: AstNode,
};

const TYPE_COLOR: Record<string, string> = {
  directory: '#60a5fa',
  file: '#34d399',
  class: '#fbbf24',
  function: '#c084fc',
};

/* 초기 자동 펼침 예산: 이 개수 이하로 보이도록 디렉토리를 BFS로 펼친다 */
const DEFAULT_VISIBLE_BUDGET = 80;

/* ReactFlow에 넘기는 객체/함수 prop은 identity 고정 (StoreUpdater 동기 갱신 루프 방지) */
const FIT_VIEW_OPTIONS = { padding: 0.1 };
const PRO_OPTIONS = { hideAttribution: true };
const CONTROLS_STYLE = {
  background: 'rgba(23, 27, 30, 0.92)',
  border: '1px solid rgba(235, 245, 251, 0.14)',
  borderRadius: 12,
  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
} as const;
const MINIMAP_STYLE = { background: '#14181b' } as const;
const minimapNodeColor = (n: Node) => TYPE_COLOR[(n.data as FlowNodeData).nodeType] ?? '#64748b';

function collectMatches(nodes: Node[], query: string): Node[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return nodes.filter((node) => {
    const d = node.data as FlowNodeData;
    const label = (d.label ?? '').toLowerCase();
    const file = (d.meta?.fileName ?? '').toLowerCase();
    return label.includes(q) || file.includes(q);
  });
}

/* 다크 테마 기준 base 엣지 스타일 (선택 시 emphasis에서 덮어씀) */
function styleBaseEdge(edge: AstFlowEdge): Edge {
  const isCall = edge.edgeType === 'call';
  return {
    ...edge,
    animated: isCall,
    style: isCall
      ? { stroke: 'rgba(251, 191, 36, 0.7)', strokeWidth: 1.8, strokeDasharray: '4 4' }
      : { stroke: 'rgba(235, 245, 251, 0.16)', strokeWidth: 1.3 },
  };
}

/* 선택 노드와 연결된 엣지는 강조, 나머지는 dim — 선택이 없으면 base 그대로 */
function emphasizeEdges(base: Edge[], selectedId: string | null): Edge[] {
  if (!selectedId) return base;
  return base.map((e) => {
    const connected = e.source === selectedId || e.target === selectedId;
    if (connected) {
      return {
        ...e,
        animated: true,
        style: { ...(e.style ?? {}), opacity: 1, stroke: 'rgba(159, 231, 240, 0.85)', strokeWidth: 2.2 },
      };
    }
    return { ...e, animated: false, style: { ...(e.style ?? {}), opacity: 0.12 } };
  });
}

const isMeasured = (n: Node) => n.measured?.width != null;

export type SearchActionType = 'focus' | 'next' | 'prev';

export interface SearchStatus {
  query: string;
  matchCount: number;
  activeIndex: number; // 0-based
}

export interface SearchAction {
  type: SearchActionType;
  seq: number;
}

interface FocusRequest {
  id: string;
  select: boolean;
  seq: number;
}

interface Props {
  snapshot: AstSnapshot | null;
  onNodeSelect?: (data: FlowNodeData | null) => void;
  searchQuery?: string;
  searchAction?: SearchAction | null;
  onSearchStatusChange?: (status: SearchStatus) => void;
  onGraphStatsChange?: (stats: { nodeCount: number; totalNodeCount: number }) => void;
  /** 코드 스멜 findings — 있으면 노드 오버레이(뱃지/링/점수)와 품질 요약 패널 표시 */
  smellFindings?: SmellFinding[] | null;
}

export default function AstFlowCanvas({
  snapshot,
  onNodeSelect,
  searchQuery = '',
  searchAction = null,
  onSearchStatusChange,
  onGraphStatsChange,
  smellFindings = null,
}: Props) {
  // @xyflow/react v12: useNodesState/useEdgesState with generic Node/Edge
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const baseEdgesRef = useRef<Edge[]>([]);
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const lastActionSeqRef = useRef<number>(-1);

  /* 펼침 상태: 노드의 모든 자식은 부모가 펼쳐져야 표시된다.
     초기값은 예산(DEFAULT_VISIBLE_BUDGET) 안에서 디렉토리를 BFS로 자동 펼친 상태. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const defaultExpandedRef = useRef<Set<string>>(new Set());

  const [focusReq, setFocusReq] = useState<FocusRequest | null>(null);
  const focusSeqRef = useRef(0);
  const lastFocusSeqRef = useRef(-1);

  /* 전체 보기 fit 요청: 노드 측정(measure)이 끝난 뒤에만 실행 */
  const [fitAllReq, setFitAllReq] = useState<number | null>(null);
  const fitSeqRef = useRef(0);
  const lastFitSeqRef = useRef(-1);
  const requestFitAll = useCallback(() => {
    fitSeqRef.current += 1;
    setFitAllReq(fitSeqRef.current);
  }, []);

  /* 전체 그래프는 스냅샷당 1회만 계산, 레이아웃은 보이는 부분만 */
  const fullGraph = useMemo(
    () => (snapshot ? astSnapshotToFlow(snapshot) : { nodes: [], edges: [] }),
    [snapshot]
  );

  const { parentMap, childrenMap } = useMemo(() => {
    const pMap = new Map<string, string>();
    const cMap = new Map<string, string[]>();
    fullGraph.edges.forEach((e) => {
      if (e.edgeType !== 'hierarchy') return;
      pMap.set(e.target, e.source);
      const arr = cMap.get(e.source);
      if (arr) arr.push(e.target);
      else cMap.set(e.source, [e.target]);
    });
    return { parentMap: pMap, childrenMap: cMap };
  }, [fullGraph]);

  /* 스냅샷 변경 시: 예산 내 자동 펼침 상태로 초기화 */
  useEffect(() => {
    const roots = fullGraph.nodes.filter((n) => !parentMap.has(n.id));
    const expanded = new Set<string>();
    let visibleCount = roots.length;
    const queue = roots.filter((n) => n.id.startsWith('dir-')).map((n) => n.id);
    while (queue.length) {
      const id = queue.shift()!;
      const kids = childrenMap.get(id) ?? [];
      if (!kids.length) continue;
      if (visibleCount + kids.length > DEFAULT_VISIBLE_BUDGET) continue;
      expanded.add(id);
      visibleCount += kids.length;
      kids.forEach((k) => {
        if (k.startsWith('dir-')) queue.push(k);
      });
    }
    defaultExpandedRef.current = expanded;
    setExpandedIds(new Set(expanded));
    selectedIdRef.current = null;
    setFocusReq(null);
    requestFitAll();
  }, [fullGraph, parentMap, childrenMap, requestFitAll]);

  const handleToggle = useCallback(
    (id: string) => {
      // functional update — 같은 틱에 토글이 겹쳐도 유실되지 않는다
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      if (!expandedIds.has(id)) {
        focusSeqRef.current += 1;
        setFocusReq({ id, select: false, seq: focusSeqRef.current });
      }
    },
    [expandedIds]
  );

  /* 보이는 노드 계산: 조상 경로가 전부 펼쳐진 노드만 표시 */
  const layouted = useMemo(() => {
    if (!fullGraph.nodes.length) {
      return { nodes: [], edges: [] } as ReturnType<typeof applyWrappedTreeLayout>;
    }

    const visible = new Set<string>();
    fullGraph.nodes.forEach((n) => {
      let parentId = parentMap.get(n.id);
      let ok = true;
      while (parentId) {
        if (!expandedIds.has(parentId)) {
          ok = false;
          break;
        }
        parentId = parentMap.get(parentId);
      }
      if (ok) visible.add(n.id);
    });

    const visNodes = fullGraph.nodes
      .filter((n) => visible.has(n.id))
      .map((n) => {
        const childCount = (childrenMap.get(n.id) ?? []).length;
        return {
          ...n,
          data: {
            ...n.data,
            expandable: childCount > 0,
            expanded: expandedIds.has(n.id),
            hiddenChildren: expandedIds.has(n.id) ? 0 : childCount,
            onToggle: handleToggle,
          },
        };
      });
    const visEdges = fullGraph.edges.filter((e) => visible.has(e.source) && visible.has(e.target));

    return applyWrappedTreeLayout(visNodes, visEdges);
  }, [fullGraph, parentMap, childrenMap, expandedIds, handleToggle]);

  /* 스멜 오버레이: 전체 그래프 기준 1회 계산 (매핑 + 롤업 + 점수) */
  const overlay = useMemo(
    () =>
      smellFindings && smellFindings.length && fullGraph.nodes.length
        ? computeSmellOverlay(fullGraph, smellFindings)
        : null,
    [smellFindings, fullGraph]
  );

  const [viewMode, setViewMode] = useState<'structure' | 'quality'>('structure');

  /* 레이아웃 결과에 오버레이 데이터만 merge — 토글 시 재레이아웃 없음 */
  const displayNodes = useMemo(() => {
    if (!overlay) return layouted.nodes;
    return layouted.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        smells: overlay.smellsByNodeId.get(n.id),
        qualityScore: overlay.scoreByNodeId.get(n.id),
        showHeat: viewMode === 'quality',
      },
    }));
  }, [layouted, overlay, viewMode]);

  useEffect(() => {
    const styledEdges = layouted.edges.map((e) => styleBaseEdge(e));
    baseEdgesRef.current = styledEdges;
    // relayout(펼침/접기 등) 후에도 선택 링·엣지 강조를 함께 복원 —
    // 선택 노드가 접혀서 화면에서 사라졌으면 강조 없이 base로 되돌린다
    const selectedId =
      selectedIdRef.current && displayNodes.some((n) => n.id === selectedIdRef.current)
        ? selectedIdRef.current
        : null;
    setNodes(displayNodes.map((n) => ({ ...n, selected: n.id === selectedId })));
    setEdges(emphasizeEdges(styledEdges, selectedId));
  }, [displayNodes, layouted, setNodes, setEdges]);

  const lastStatsRef = useRef({ nodeCount: -1, totalNodeCount: -1 });
  useEffect(() => {
    const stats = { nodeCount: nodes.length, totalNodeCount: fullGraph.nodes.length };
    const prev = lastStatsRef.current;
    if (prev.nodeCount === stats.nodeCount && prev.totalNodeCount === stats.totalNodeCount) return;
    lastStatsRef.current = stats;
    onGraphStatsChange?.(stats);
  }, [nodes.length, fullGraph.nodes.length, onGraphStatsChange]);

  const resetEdgeEmphasis = useCallback(() => {
    if (!baseEdgesRef.current.length) return;
    setEdges(baseEdgesRef.current);
  }, [setEdges]);

  const applyNodeFocus = useCallback(
    (node: Node) => {
      const id = node.id;
      selectedIdRef.current = id;
      onNodeSelect?.(node.data as FlowNodeData);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
      const base = baseEdgesRef.current;
      if (!base.length) return;
      setEdges(
        base.map((e) => {
          const connected = e.source === id || e.target === id;
          if (connected) {
            return {
              ...e,
              animated: true,
              style: { ...(e.style ?? {}), opacity: 1, stroke: 'rgba(159, 231, 240, 0.85)', strokeWidth: 2.2 },
            };
          }
          return { ...e, animated: false, style: { ...(e.style ?? {}), opacity: 0.12 } };
        })
      );
    },
    [onNodeSelect, setEdges, setNodes]
  );

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      applyNodeFocus(node);
    },
    [applyNodeFocus]
  );

  const handleNodeDoubleClick = useCallback(
    (_: MouseEvent, node: Node) => {
      const d = node.data as FlowNodeData;
      if (d.expandable) handleToggle(node.id);
    },
    [handleToggle]
  );

  /* 전체 fit 요청 처리: 모든 노드가 측정된 뒤에만 실행 (미측정 상태에서 fit하면 빈 곳으로 감) */
  useEffect(() => {
    if (fitAllReq === null || lastFitSeqRef.current === fitAllReq) return;
    if (!nodes.length) return;
    if (!nodes.every(isMeasured)) return; // 측정 완료까지 대기 — 다음 nodes 갱신에서 재시도
    lastFitSeqRef.current = fitAllReq;
    requestAnimationFrame(() => {
      rfRef.current?.fitView({ padding: 0.1, duration: 400, maxZoom: 1, minZoom: 0.03 });
    });
  }, [fitAllReq, nodes]);

  /* focus 요청 처리: 대상 노드(와 방금 펼친 자식들)가 렌더·측정된 뒤 화면에 꽉 차게 확대 */
  useEffect(() => {
    if (!focusReq || lastFocusSeqRef.current === focusReq.seq) return;
    const node = nodes.find((n) => n.id === focusReq.id);
    if (!node) return; // 아직 relayout 반영 전 — 다음 nodes 갱신에서 처리

    const childIds = childrenMap.get(focusReq.id) ?? [];
    const childSet = new Set(childIds);
    const visibleChildren = nodes.filter((n) => childSet.has(n.id));
    if (!focusReq.select && childIds.length > 0 && visibleChildren.length === 0) {
      return; // 펼친 자식이 렌더될 때까지 대기
    }

    const fitTargets = [node, ...visibleChildren];
    if (!fitTargets.every(isMeasured)) return; // 측정 완료까지 대기

    lastFocusSeqRef.current = focusReq.seq;
    if (focusReq.select) applyNodeFocus(node);

    const targetIds = fitTargets.map((n) => ({ id: n.id }));
    requestAnimationFrame(() => {
      rfRef.current?.fitView({
        nodes: targetIds,
        padding: targetIds.length > 1 ? 0.18 : 0.35,
        duration: 450,
        maxZoom: 1.6,
        minZoom: 0.03,
      });
    });
  }, [focusReq, nodes, childrenMap, applyNodeFocus]);

  /* 검색은 숨겨진 노드 포함 전체 그래프 대상 */
  const matches = useMemo(() => collectMatches(fullGraph.nodes, searchQuery), [fullGraph.nodes, searchQuery]);

  useEffect(() => {
    setActiveMatchIdx(0);
  }, [searchQuery]);

  useEffect(() => {
    setActiveMatchIdx((i) => {
      if (!matches.length) return 0;
      return Math.min(i, matches.length - 1);
    });
  }, [matches.length]);

  const lastStatusRef = useRef<SearchStatus>({ query: ' ', matchCount: -1, activeIndex: -1 });
  useEffect(() => {
    const status: SearchStatus = {
      query: searchQuery,
      matchCount: matches.length,
      activeIndex: activeMatchIdx,
    };
    const prev = lastStatusRef.current;
    if (
      prev.query === status.query &&
      prev.matchCount === status.matchCount &&
      prev.activeIndex === status.activeIndex
    ) {
      return;
    }
    lastStatusRef.current = status;
    onSearchStatusChange?.(status);
  }, [activeMatchIdx, matches.length, onSearchStatusChange, searchQuery]);

  const goToMatchIndex = useCallback(
    (idx: number) => {
      if (!matches.length) return;
      const i = ((idx % matches.length) + matches.length) % matches.length;
      setActiveMatchIdx(i);
      const node = matches[i];

      // 매치 노드가 보이도록 조상 경로를 모두 펼침
      setExpandedIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        let cur = parentMap.get(node.id);
        while (cur) {
          if (!next.has(cur)) {
            next.add(cur);
            changed = true;
          }
          cur = parentMap.get(cur);
        }
        return changed ? next : prev;
      });

      focusSeqRef.current += 1;
      setFocusReq({ id: node.id, select: true, seq: focusSeqRef.current });
    },
    [matches, parentMap]
  );

  useEffect(() => {
    if (!searchAction) return;
    if (lastActionSeqRef.current === searchAction.seq) return;
    lastActionSeqRef.current = searchAction.seq;

    if (!searchQuery.trim()) return;
    if (!matches.length) return;

    if (searchAction.type === 'focus') {
      goToMatchIndex(activeMatchIdx);
      return;
    }
    if (searchAction.type === 'next') {
      goToMatchIndex(activeMatchIdx + 1);
      return;
    }
    if (searchAction.type === 'prev') {
      goToMatchIndex(activeMatchIdx - 1);
    }
  }, [activeMatchIdx, goToMatchIndex, matches.length, searchAction, searchQuery]);

  const expandAllDirs = useCallback(() => {
    setExpandedIds(new Set(fullGraph.nodes.filter((n) => n.id.startsWith('dir-')).map((n) => n.id)));
    requestFitAll();
  }, [fullGraph.nodes, requestFitAll]);

  const resetToDefaultView = useCallback(() => {
    setExpandedIds(new Set(defaultExpandedRef.current));
    requestFitAll();
  }, [requestFitAll]);

  if (!snapshot) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🔍</div>
        <h3>스냅샷을 선택하세요</h3>
        <p>좌측에서 빌드 스냅샷을 선택하면 코드 구조가 시각화됩니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.canvasWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={() => {
          selectedIdRef.current = null;
          onNodeSelect?.(null);
          setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
          resetEdgeEmphasis();
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.03}
        maxZoom={2}
        zoomOnDoubleClick={false}
        proOptions={PRO_OPTIONS}
        onInit={(instance) => {
          rfRef.current = instance;
        }}
      >
        <Panel position="top-left" className={styles.canvasActions}>
          <button type="button" className={styles.actionBtn} onClick={resetToDefaultView}>
            기본 보기
          </button>
          <button type="button" className={styles.actionBtn} onClick={expandAllDirs}>
            파일까지 펼치기
          </button>
          {overlay && (
            <button
              type="button"
              className={`${styles.actionBtn} ${viewMode === 'quality' ? styles.actionBtnActive : ''}`}
              onClick={() => setViewMode((m) => (m === 'quality' ? 'structure' : 'quality'))}
            >
              품질 히트맵
            </button>
          )}
        </Panel>
        {overlay && (
          <Panel position="top-right" className={styles.scorePanel}>
            <div className={styles.scoreValue} data-grade={overlay.overallScore >= 90 ? 'good' : overlay.overallScore >= 70 ? 'warn' : 'bad'}>
              품질 {overlay.overallScore}점
            </div>
            <div className={styles.scoreMeta}>
              스멜 {overlay.total} · High {overlay.high} · Medium {overlay.medium}
              {overlay.unmatched > 0 && ` · 미매핑 ${overlay.unmatched}`}
            </div>
          </Panel>
        )}
        <Controls style={CONTROLS_STYLE} />
        <MiniMap
          pannable
          zoomable
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={0}
          maskColor="rgba(18, 22, 25, 0.78)"
          style={MINIMAP_STYLE}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(235, 245, 251, 0.1)" />
      </ReactFlow>
    </div>
  );
}
