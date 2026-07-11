import type { Node, Edge } from '@xyflow/react';
import { applyDagreLayout } from './layoutEngine';
import type { SnippetAstGraph } from '../services/codeAnalysisService';

// 백엔드가 내려주는 구조 단위(kind) → AstNode 노드 타입.
// DB 4계층(디렉토리→파일→클래스→메서드)과 동일한 어휘를 쓴다(스니펫은 file부터 시작).
const KIND_TO_NODE_TYPE: Record<string, string> = {
  directory: 'directory',
  file: 'file',
  class: 'class',
  method: 'function',
  function: 'function',
};

/**
 * 스니펫 분석 응답(ast.nodes/edges)을 ReactFlow 그래프로 변환하고 dagre 레이아웃을 적용한다.
 * InstantInsight에서 분리(뷰 로직과 데이터 변환의 관심사 분할).
 */
export function snippetAstToFlow(ast: SnippetAstGraph): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = ast.nodes.map((n: any) => {
    // 신규 계약: data.kind('file'|'class'|'method'|'function') + data.name
    let type = n.data.kind ? (KIND_TO_NODE_TYPE[n.data.kind] ?? 'file') : '';
    if (!type) {
      // 구버전 응답(전체 AST 노드) 호환용 휴리스틱
      type = 'file';
      if (n.data.label.includes('function')) type = 'function';
      else if (n.data.label.includes('class')) type = 'class';
      else if (n.data.label === 'program' || n.data.label === 'module') type = 'directory';
    }

    return {
      id: n.id,
      type: 'astNode',
      position: { x: 0, y: 0 },
      data: {
        label: (n.data.name ?? n.data.text ?? '').replace('...', ''),
        nodeType: type,
        meta: { fileName: n.data.label },
      },
    };
  });

  const flowEdges: Edge[] = ast.edges.map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#4a5568', strokeWidth: 1.5 },
  }));

  return applyDagreLayout(flowNodes as any, flowEdges as any, 'TB');
}
