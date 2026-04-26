import type { AstSnapshot, AstTreeDirectory, AstDirectory } from '../interface/ast.interface';
import type { AstFlowNode, AstFlowEdge, FlowResult } from '../interface/flow.interface';

// ────────────────────────────────────────────────────────────
// Helper: flat directory 배열 → 트리 구조
// ────────────────────────────────────────────────────────────
export function buildDirectoryTree(dirs: AstDirectory[]): AstTreeDirectory[] {
  const map = new Map<number, AstTreeDirectory>();

  dirs.forEach((d) => {
    map.set(d.id, { ...d, treeChildren: [] });
  });

  const roots: AstTreeDirectory[] = [];

  map.forEach((dir) => {
    if (dir.parentDirectoryId === null) {
      roots.push(dir);
    } else {
      const parent = map.get(dir.parentDirectoryId);
      if (parent) {
        parent.treeChildren.push(dir);
      }
    }
  });

  return roots;
}

// ────────────────────────────────────────────────────────────
// Helper: Tree-sitter 아티팩트 클래스 필터링
// name === 'class' && methods.length === 0 인 엔트리는 제외
// ────────────────────────────────────────────────────────────
function isArtifactClass(c: { name: string; methods: unknown[] }): boolean {
  return c.name === 'class';
}

// ────────────────────────────────────────────────────────────
// Main: AstSnapshot → React Flow Nodes & Edges
// ────────────────────────────────────────────────────────────
export function astSnapshotToFlow(snapshot: AstSnapshot): FlowResult {
  const nodes: AstFlowNode[] = [];
  const edges: AstFlowEdge[] = [];

  const addEdge = (source: string, target: string) => {
    edges.push({
      id: `e-${source}-${target}`,
      source,
      target,
      type: 'smoothstep',
      animated: false,
      edgeType: 'hierarchy',
      style: { stroke: '#4a5568', strokeWidth: 1.5 },
    });
  };

  const processDir = (dir: AstTreeDirectory, parentId?: string) => {
    const dirNodeId = `dir-${dir.id}`;

    nodes.push({
      id: dirNodeId,
      type: 'astNode',
      position: { x: 0, y: 0 }, // Dagre가 덮어씀
      data: {
        label: dir.name,
        nodeType: 'directory',
        meta: {
          fileCount: dir.files.length,
          childDirCount: dir.treeChildren.length,
        },
      },
    });

    if (parentId) {
      addEdge(parentId, dirNodeId);
    }

    // 하위 디렉토리 재귀
    dir.treeChildren.forEach((child) => processDir(child, dirNodeId));

    // 파일 처리
    dir.files.forEach((file) => {
      const fileNodeId = `file-${file.id}`;
      const realClasses = file.classes.filter((c) => !isArtifactClass(c));

      nodes.push({
        id: fileNodeId,
        type: 'astNode',
        position: { x: 0, y: 0 },
        data: {
          label: file.name,
          nodeType: 'file',
          meta: {
            fileName: file.name,
          },
        },
      });
      addEdge(dirNodeId, fileNodeId);

      // 클래스 처리
      realClasses.forEach((cls) => {
        const classNodeId = `class-${cls.id}`;

        nodes.push({
          id: classNodeId,
          type: 'astNode',
          position: { x: 0, y: 0 },
          data: {
            label: cls.name,
            nodeType: 'class',
            metrics: cls.metrics,
            meta: {
              startLine: cls.startLine,
              endLine: cls.endLine,
              methodCount: cls.methods.length,
            },
          },
        });
        addEdge(fileNodeId, classNodeId);

        // 클래스 메서드
        cls.methods.forEach((method) => {
          const methodNodeId = `func-${method.id}`;
          nodes.push({
            id: methodNodeId,
            type: 'astNode',
            position: { x: 0, y: 0 },
            data: {
              label: method.name,
              nodeType: 'function',
              meta: {
                startLine: method.startLine,
                endLine: method.endLine,
              },
            },
          });
          addEdge(classNodeId, methodNodeId);
        });
      });

      // 파일 직속 함수 (classId === null)
      file.fileFunctions
        .filter((fn) => fn.classId === null)
        .forEach((fn) => {
          const fnNodeId = `func-${fn.id}`;
          nodes.push({
            id: fnNodeId,
            type: 'astNode',
            position: { x: 0, y: 0 },
            data: {
              label: fn.name,
              nodeType: 'function',
              meta: {
                startLine: fn.startLine,
                endLine: fn.endLine,
              },
            },
          });
          addEdge(fileNodeId, fnNodeId);
        });
    });
  };

  // flat → tree
  const roots = buildDirectoryTree(snapshot.directories);
  roots.forEach((root) => processDir(root));

  // Add method call edges
  if (snapshot.methodCalls) {
    snapshot.methodCalls.forEach((call) => {
      edges.push({
        id: `call-${call.callerId}-${call.calleeId}`,
        source: `func-${call.callerId}`,
        target: `func-${call.calleeId}`,
        type: 'smoothstep',
        animated: true,
        edgeType: 'call',
        style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 4' },
      });
    });
  }

  return { nodes, edges };
}
