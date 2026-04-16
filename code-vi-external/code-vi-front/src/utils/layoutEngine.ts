import dagre from 'dagre';
import type { AstFlowNode, AstFlowEdge } from '../interface/flow.interface';

const NODE_WIDTH = 200;

const NODE_HEIGHT: Record<string, number> = {
  directory: 48,
  file: 44,
  class: 52,
  function: 40,
};

/**
 * Dagre를 사용하여 React Flow 노드에 자동 레이아웃 적용
 * 방향: TB (위→아래)
 */
export function applyDagreLayout(
  nodes: AstFlowNode[],
  edges: AstFlowEdge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: AstFlowNode[]; edges: AstFlowEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 60, nodesep: 30, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    const type = node.data.nodeType;
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT[type] ?? 44,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const type = node.data.nodeType;
    const h = NODE_HEIGHT[type] ?? 44;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - h / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
