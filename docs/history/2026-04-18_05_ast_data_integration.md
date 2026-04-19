# Implementation Record: AST Data Integration (React Flow)

## 1. Intent (작업 의도)
백엔드에 적재된 `ast-relational` 계층형 데이터(디렉토리 → 파일 → 클래스 → 함수)를 프론트엔드의 `React Flow`가 요구하는 평면 배열 구조(Nodes/Edges)로 변환하는 파이프라인을 구축한다. 의존성 엉킴을 막기 위해 철저히 프론트엔드 생태계를 확인하고 D3.js가 아닌 React Flow에 맞췄다.

## 2. Result (결과)
- **Backend (Phase 1 & 2)**
  - `dto/react-flow-graph.dto.ts`를 신설하여 `ReactFlowNodeDto`, `ReactFlowEdgeDto` 정의.
  - `ast-relational.service.ts`에 `getGraphData` 로직 구현: 트리 순회 알고리즘(DFS)을 사용해 Node를 1차원 배열에 쌓고, 부모-자식 간의 계층 모서리(hierarchy edge)를 추출. 위치(position) 초깃값도 부여.
  - 컨트로러에 `/api/ast-data/relational/:snapshotId/graph` 엔드포인트 오픈. 백엔드 빌드 무결성 통과.
- **Frontend (Phase 3)**
  - `astDataService.ts`에 `getSnapshotGraph` 연동. (기존 `FlowResult` 인터페이스 매핑 확증)
  - 컴포넌트 생명주기에 안전하게 대응하는 `useAstGraphData.ts` 커스텀 훅 완성.

## 3. Retrospective (회고)
초기 명세 작성 시 Navigator.md에 적힌 "D3.js" 문구를 믿고 방향을 잘못 잡을 뻔했으나, '의존성 무결성 확인' 정책 덕분에 실제 패키지(`@xyflow/react`)를 파악하여 참사를 막을 수 있었다.
현재 백엔드가 뱉어내는 Edge는 '디렉토리-파일-구조' 계층을 나타내는 계층 엣지이다. 향후 진정한 "기능 결합도"를 보여주려면 메서드 호출 관계(MetricsService 등)에서 뽑은 Call Edge가 추가로 병합되어야 함을 확인했다.
