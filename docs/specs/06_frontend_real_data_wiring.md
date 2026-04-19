# Specification: Frontend Real Data Wiring (React Flow)

## 1. Objective (목표)
기존 하드코딩된 `dummy` 데이터를 사용하던 프론트엔드 시각화 페이지 및 대시보드를 버리고, 실제 백엔드로부터 생성된 엔드포인트(`.getSnapshotGraph`) 기반의 실시간 데이터 파이프라인으로 교체한다. 
특히 프론트엔드에서 부담하던 AST Object -> Nodes/Edges 변환 책임을 백엔드의 API가 짊어지도록 `AstFlowCanvas` 컴포넌트의 입력 방식을 개편한다.

## 2. Tech Stack (기술 스택)
- **Frontend Layer**: React Custom Hooks (`useAstGraphData`), `astDataService` (Real Axios), `applyDagreLayout` (UI 레이아웃만 담당)

## 3. Implementation Phases (구현 단계)

### Phase 1: `VisualizationPage.tsx` 데이터 파이프라인 교체
- `test_astDataService` 임포트 제거 및 Dummy 로직 폐기.
- 앞서 제작한 `useAstGraphData` 훅을 호출하여 백엔드로부터 `FlowResult` (nodes, edges)를 직접 패칭.
- 기존의 `snapshot` 스키마에 맞춰져 있던 `stats` (디렉토리 수, 파일 수) 계산 로직을 `FlowResult.nodes` 배열의 `nodeType`을 세는 로직으로 리팩토링.

### Phase 2: `AstFlowCanvas.tsx` 컴포넌트 軽量化 (경량화)
- 기존에 `AstSnapshot` 객체를 통째로 받던 Props 인터페이스를 `FlowResult` (nodes 배열, edges 배열)를 직접 받도록 변경.
- 프론트엔드의 무거운 트리 재귀 분해 헬퍼(`astSnapshotToFlow`) 호출 제거.
- 백엔드가 보내준 Nodes와 Edges를 곧바로 `applyDagreLayout`에 던져서 좌표(`x`, `y`)만 계산한 뒤 캔버스에 마운트(Mount) 하도록 로직 단순화.

## 4. Acceptance Criteria (검증 기준)
- [ ] 프론트엔드 컴파일 시 `test_astDataService` 의존성이 남아있지 않아야 한다.
- [ ] 시각화 페이지 진입 시 로딩 상태(`isLoading`)가 제대로 트리거 되며, 네트워크 탭에서 백엔드 `/api/ast-data/relational/:snapshotId/graph` 호출이 잡혀야 한다.
- [ ] Dagre(자동 위치 결정)가 정상 작동하여 모든 노드가 한곳에 겹치지 않고 트리가 시각적으로 잘 전개되어야 한다.
- [ ] 노드를 클릭 시 상세 패널(사이드바)에 여전히 올바른 정보가 표시되어야 한다.

## 5. Dependencies (의존성)
- 직전 명세(`05_ast_data_integration.md`)에서 완료한 API 및 Hook 인프라 필수.
- 향후 추가될 메트릭 정보(Metrics)를 쥐어주기 위한 UI 그릇 유지에 주의.
