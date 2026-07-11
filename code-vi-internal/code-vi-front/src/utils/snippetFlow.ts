import type { Node, Edge } from '@xyflow/react';
import { applyDagreLayout } from './layoutEngine';
import type { SnippetAstGraph } from '../services/codeAnalysisService';

/**
 * 스니펫 분석 응답(ast.nodes/edges)을 ReactFlow 그래프로 변환하고 dagre 레이아웃을 적용한다.
 * InstantInsight에서 분리(뷰 로직과 데이터 변환의 관심사 분할).
 */
export function snippetAstToFlow(ast: SnippetAstGraph): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = ast.nodes.map((n: any) => {
    let type = 'file';
    if (n.data.label.includes('function')) type = 'function';
    else if (n.data.label.includes('class')) type = 'class';
    else if (n.data.label === 'program' || n.data.label === 'module') type = 'directory';

    return {
      id: n.id,
      type: 'astNode',
      position: { x: 0, y: 0 },
      data: {
        label: n.data.text.replace('...', ''),
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
