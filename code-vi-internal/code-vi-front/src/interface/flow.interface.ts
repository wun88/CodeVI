import type { Node, Edge } from '@xyflow/react';

// CK Metrics (Chidamber & Kemerer)
export interface CkMetrics {
  cbo: number;  // Coupling Between Objects
  rfc: number;  // Response For a Class
  lcom: number; // Lack of Cohesion in Methods
  wmc: number;  // Weighted Methods per Class
  dit: number;  // Depth of Inheritance Tree
  noc: number;  // Number of Children
}

// React Flow 노드 타입
export type FlowNodeType = 'directory' | 'file' | 'class' | 'function';

// @xyflow/react v12: NodeData must satisfy Record<string, unknown>
export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: FlowNodeType;
  metrics?: CkMetrics;
  /* 펼치기/접기 (AstFlowCanvas에서 주입) */
  expandable?: boolean;
  expanded?: boolean;
  hiddenChildren?: number;
  onToggle?: (id: string) => void;
  /* 스멜 오버레이 (AstFlowCanvas에서 주입) — 디렉토리는 하위 롤업 값 */
  smells?: { high: number; medium: number; total: number; names: string[] };
  qualityScore?: number;
  showHeat?: boolean;
  meta?: {
    startLine?: number;
    endLine?: number;
    startCol?: number;
    endCol?: number;
    fileName?: string;
    fullPath?: string;
    methodCount?: number;
    fileCount?: number;
    childDirCount?: number;
  };
}

export type AstFlowNode = Node<FlowNodeData>;
export type AstFlowEdge = Edge & {
  edgeType?: 'hierarchy' | 'call';
};

export interface FlowResult {
  nodes: AstFlowNode[];
  edges: AstFlowEdge[];
}
