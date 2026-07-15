import type { Node, Edge } from '@xyflow/react';
import { applyDagreLayout } from './layoutEngine';

/**
 * zip-analysis(1회성) 응답의 파서 트리를 DB 4계층(디렉토리→파일→클래스→메서드)
 * ReactFlow 그래프로 변환한다. 스니펫(snippetFlow)과 동일한 구조 어휘를 쓰되,
 * 입력이 파서의 raw tree-sitter JSON이라 이름 추출을 프론트에서 수행한다.
 */

// 파서(/analyze) 응답 노드
interface ParserAstNode {
  type: string;
  text?: string;
  fieldName?: string;
  isNamed?: boolean;
  children?: ParserAstNode[];
}

export interface ParserTreeNode {
  type: 'directory' | 'file';
  name: string;
  filePath?: string;
  children?: ParserTreeNode[];
  ast?: ParserAstNode;
}

export interface ZipFlowStats {
  directories: number;
  files: number;
  classes: number;
  functions: number;
}

// 백엔드 analyzePartialCode와 동일한 구조 노드 화이트리스트
const CLASS_NODE_TYPES = new Set([
  'class_definition', // python
  'class_declaration', // ts/js/java
  'abstract_class_declaration', // ts
  'interface_declaration', // ts/java
  'enum_declaration', // ts/java
  'struct_specifier', // c (body 있는 정의만)
]);
const FUNCTION_NODE_TYPES = new Set([
  'function_definition', // python/c
  'function_declaration', // ts/js
  'generator_function_declaration', // js
  'method_definition', // ts/js
  'method_declaration', // java
  'constructor_declaration', // java
  'arrow_function', // ts/js: const f = () => {}
  'function_expression', // js: const f = function () {}
]);

const field = (node: ParserAstNode, name: string): ParserAstNode | undefined =>
  node.children?.find((c) => c.fieldName === name);

function extractAstName(node: ParserAstNode): string | null {
  const named = field(node, 'name');
  if (named?.text) return named.text;
  // c: function_definition은 declarator 체인 안에 식별자가 있다
  let cur: ParserAstNode | null = field(node, 'declarator') ?? null;
  for (let depth = 0; cur && depth < 10; depth++) {
    if (cur.type === 'identifier' || cur.type === 'field_identifier') return cur.text ?? null;
    cur =
      field(cur, 'declarator') ??
      cur.children?.find((c) => c.isNamed) ??
      cur.children?.[0] ??
      null;
  }
  return null;
}

const lastSegment = (name: string) => name.split('/').filter(Boolean).pop() ?? name;

export function zipTreeToFlow(treeNodes: ParserTreeNode[]): {
  nodes: Node[];
  edges: Edge[];
  stats: ZipFlowStats;
} {
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];
  const stats: ZipFlowStats = { directories: 0, files: 0, classes: 0, functions: 0 };
  let idCounter = 0;

  const pushNode = (
    nodeType: 'directory' | 'file' | 'class' | 'function',
    label: string,
    meta: Record<string, unknown>,
    parentId: string | null,
  ): string => {
    const id = `zip_${idCounter++}`;
    flowNodes.push({
      id,
      type: 'astNode',
      position: { x: 0, y: 0 },
      data: { label, nodeType, meta },
    });
    if (parentId) {
      flowEdges.push({
        id: `e_${parentId}_${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#4a5568', strokeWidth: 1.5 },
      });
    }
    return id;
  };

  // 파일 AST 내부: 클래스/메서드/함수 추출 (snippet 백엔드 walkStructure와 동일 규칙)
  const walkAst = (node: ParserAstNode, parentId: string, insideClass: boolean) => {
    for (const child of node.children ?? []) {
      if (CLASS_NODE_TYPES.has(child.type) && field(child, 'body')) {
        stats.classes++;
        const classId = pushNode('class', extractAstName(child) ?? child.type, { fileName: child.type }, parentId);
        walkAst(child, classId, true);
      } else if (FUNCTION_NODE_TYPES.has(child.type)) {
        let name = extractAstName(child);
        // const f = () => {} — 부모 variable_declarator의 name을 사용
        if (name === null && node.type === 'variable_declarator') {
          name = field(node, 'name')?.text ?? null;
        }
        if (name === null && (child.type === 'arrow_function' || child.type === 'function_expression')) {
          walkAst(child, parentId, insideClass); // 익명 인라인 콜백은 노드 생략
          continue;
        }
        stats.functions++;
        const label = name ?? child.type;
        const fnId = pushNode('function', label, { fileName: insideClass ? 'method' : 'function' }, parentId);
        walkAst(child, fnId, false);
      } else {
        walkAst(child, parentId, insideClass);
      }
    }
  };

  // 바깥 트리: 디렉토리/파일
  const walkTree = (node: ParserTreeNode, parentId: string | null) => {
    if (node.type === 'directory') {
      stats.directories++;
      const dirId = pushNode('directory', lastSegment(node.name), { fileCount: node.children?.length ?? 0 }, parentId);
      for (const child of node.children ?? []) walkTree(child, dirId);
    } else {
      stats.files++;
      const fileId = pushNode('file', lastSegment(node.name), { fileName: node.name }, parentId);
      if (node.ast) walkAst(node.ast, fileId, false);
    }
  };

  for (const root of treeNodes) walkTree(root, null);

  const { nodes, edges } = applyDagreLayout(flowNodes as any, flowEdges as any, 'TB');
  return { nodes, edges, stats };
}
