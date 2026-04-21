export class ReactFlowNodeDataDto {
  label: string;
  type: string; // 'DIRECTORY', 'FILE', 'CLASS', 'FUNCTION'
  metrics?: any; // 결합도나 복잡도 등을 나중에 담을 그릇
  details?: any; // 추가 정보 (파일 경로, 라인 넘버 등)
  meta?: any; // 메서드 개수, 파일수 등
}

export class ReactFlowNodeDto {
  id: string; // React Flow는 id를 string으로 요구함
  position: { x: number; y: number }; // 레이아웃은 프론트(dagre)가 잡겠지만 기본값 필수
  data: ReactFlowNodeDataDto;
  type?: string; // 커스텀 노드 타입을 위해 사용 가능
}

export class ReactFlowEdgeDto {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  type?: string; // 'smoothstep', 'straight', 'bezier'
}

export class ReactFlowGraphResponseDto {
  nodes: ReactFlowNodeDto[];
  edges: ReactFlowEdgeDto[];
}
