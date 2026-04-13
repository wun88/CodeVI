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
import { astSnapshotToFlow } from '../../utils/astToFlow';
import { applyDagreLayout } from '../../utils/layoutEngine';
import styles from './AstFlowCanvas.module.css';

const nodeTypes: NodeTypes = {
  astNode: AstNode,
};

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

interface Props {
  snapshot: AstSnapshot | null;
  onNodeSelect?: (data: FlowNodeData) => void;
  searchQuery?: string;
  searchAction?: SearchAction | null;
  onSearchStatusChange?: (status: SearchStatus) => void;
  onGraphStatsChange?: (stats: { nodeCount: number }) => void;
}

export default function AstFlowCanvas({
  snapshot,
  onNodeSelect,
  searchQuery = '',
  searchAction = null,
  onSearchStatusChange,
  onGraphStatsChange,
}: Props) {
  // @xyflow/react v12: useNodesState/useEdgesState with generic Node/Edge
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(false);
  const baseEdgesRef = useRef<Edge[]>([]);
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const lastActionSeqRef = useRef<number>(-1);

  useEffect(() => {
    if (!snapshot) return;

    setIsLoading(true);
    setTimeout(() => {
      const { nodes: rawNodes, edges: rawEdges } = astSnapshotToFlow(snapshot);
      const { nodes: lNodes, edges: lEdges } = applyDagreLayout(rawNodes, rawEdges, 'TB');
      setNodes(lNodes);
      setEdges(lEdges);
      baseEdgesRef.current = lEdges;
      setIsLoading(false);
    }, 0);
  }, [snapshot, setNodes, setEdges]);

  /* 노드가 뒤늦게 채워질 때 초기 fitView만으로는 뷰가 비어 보일 수 있음 */
  useEffect(() => {
    if (!snapshot || nodes.length === 0 || isLoading) return;
    const id = requestAnimationFrame(() => {
      rfRef.current?.fitView({ padding: 0.12, duration: 0, maxZoom: 1.25, minZoom: 0.04 });
    });
    return () => cancelAnimationFrame(id);
  }, [snapshot, nodes.length, isLoading]);

  useEffect(() => {
    onGraphStatsChange?.({ nodeCount: nodes.length });
  }, [nodes.length, onGraphStatsChange]);

  const resetEdgeEmphasis = useCallback(() => {
    const base = baseEdgesRef.current;
    if (!base.length) return;
    setEdges(
      base.map((e) => ({
        ...e,
        animated: false,
        style: { ...(e.style ?? {}), opacity: 0.55, stroke: '#6b90ad', strokeWidth: 1.6 },
      }))
    );
  }, [setEdges]);

  const applyNodeFocus = useCallback(
    (node: Node) => {
      const id = node.id;
      onNodeSelect?.(node.data as FlowNodeData);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
      const base = baseEdgesRef.current;
      if (!base.length) return;
      setEdges(
        base.map((e) => {
          const connected = e.source === id || e.target === id;
          return {
            ...e,
            animated: connected,
            style: {
              ...(e.style ?? {}),
              opacity: connected ? 1 : 0.18,
              stroke: connected ? '#4a6a8a' : '#8fb0c8',
              strokeWidth: connected ? 2.8 : 1.4,
            },
          };
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

  const matches = useMemo(() => collectMatches(nodes, searchQuery), [nodes, searchQuery]);

  useEffect(() => {
    setActiveMatchIdx(0);
  }, [searchQuery]);

  useEffect(() => {
    setActiveMatchIdx((i) => {
      if (!matches.length) return 0;
      return Math.min(i, matches.length - 1);
    });
  }, [matches.length]);

  useEffect(() => {
    onSearchStatusChange?.({
      query: searchQuery,
      matchCount: matches.length,
      activeIndex: activeMatchIdx,
    });
  }, [activeMatchIdx, matches.length, onSearchStatusChange, searchQuery]);

  const goToMatchIndex = useCallback(
    (idx: number) => {
      if (!matches.length) return;
      const i = ((idx % matches.length) + matches.length) % matches.length;
      setActiveMatchIdx(i);
      const node = matches[i];
      applyNodeFocus(node);
      requestAnimationFrame(() => {
        rfRef.current?.fitView({
          nodes: [{ id: node.id }],
          padding: 0.4,
          duration: 420,
          maxZoom: 1.35,
          minZoom: 0.05,
        });
      });
    },
    [applyNodeFocus, matches]
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
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>AST 구조 렌더링 중...</span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={() => {
          onNodeSelect?.(null as unknown as FlowNodeData);
          setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
          resetEdgeEmphasis();
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        onInit={(instance) => {
          rfRef.current = instance;
        }}
      >
        <Controls
          style={{
            background: 'rgba(255,255,255,0.62)',
            border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 12,
            boxShadow: '0 4px 14px rgba(34,34,34,0.05)',
          }}
        />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="rgba(124, 161, 191, 0.55)" />
      </ReactFlow>
    </div>
  );
}
