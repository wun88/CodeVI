# Implementation Record: Frontend Real Data Wiring (React Flow)

## 1. Intent (작업 의도)
기존 프로젝트에 임시방편으로 걸려있던 `dummy` 데이터를 제거하고, 프론트엔드가 백엔드 노드/엣지 엔드포인트를 직접 바라보게 하는 "Real Data Wiring"을 수행한다.
핵심 목표는 컴포넌트(AstFlowCanvas)를 순수 뷰(View) 계층으로 끌어내리며, 값싸고 튼튼한 프론트엔드 아키텍처를 구현하는 것이다.

## 2. Result (결과)
- **Phase 1: Hook 어댑터 포장 및 대시보드 연동**
  - 백엔드의 API가 뱉는 대문자 `type='DIRECTORY'`를 프론트엔드 ReactFlow 규격인 소문자 `nodeType='directory'`로 변환해주는 매핑 로직을 `useAstGraphData.ts`에 주입 (방어적 프로그래밍).
  - `src/hooks/useDashboardData.ts`의 서비스 호출부를 `test_astDataService`에서 진짜 `astDataService`로 교체.
- **Phase 2: 핵심 시각화 컴포넌트 軽量化 (경량화)**
  - `VisualizationPage.tsx`에서 구식 로직과 `dummy` 의존성을 날려버리고 `useAstGraphData` 훅으로 데이터 호출.
  - `AstFlowCanvas.tsx` 내부에서 억지로 돌리던 재귀 파서 `astSnapshotToFlow`를 제거하여 CPU 병목을 해소.
  - 백엔드로부터 `FlowResult` (nodes/edges)를 받자마자 바로 좌표 계산(`applyDagreLayout`) 로직으로 직행하도록 렌더링 파이프라인 최적화.

## 3. Retrospective (회고)
초기에 백엔드 DTO 설계 모델과 프론트엔드 FlowInterface 사이의 사소한 포맷 불일치(`type` vs `nodeType`)가 발견되었다. 이를 교정하기 위해 백엔드를 재빌드하는 대신, 프론트엔드의 `useAstGraphData` 훅 단에서 가볍게 어댑터(Adapter) 패턴으로 치환해버림으로써 빌드 시간을 절약하고 클라이언트 사이드의 회복 탄력성(Resilience)을 증명했다.
프론트엔드 코어 모델이 이제 완벽하게 백엔드 스키마와 결합되었다. 다음 작업으로는 이 그래프 노드들 사이에 서로 호출하는 관계(Call Edge)를 그려 넣을 수 있다.
