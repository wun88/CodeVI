# 상세 시각화 가독성 개선 및 다크 톤 재디자인

## 1. 작업 개요
- **일시**: 2026-08-30
- **작업자**: byoon (agent)
- **대상**: `code-vi-internal/code-vi-front` 상세 시각화 화면 (`/visualization/:snapshotId`)
- **브랜치**: `jby_visualization_enhancement`

## 2. 의도 (Intent)
- **작업 동기**: 노드 3,000개 이상인 스냅샷에서 dagre가 전체 트리를 한 줄로 펼쳐 fitView가 극단적으로 축소되고, 화면에서 아무것도 읽을 수 없었다. 또한 시각화 페이지만 라이트 글래스 테마라 대시보드(다크 시네마틱)와 톤이 어긋났다.
- **디자인 결정**:
  - **점진적 탐색(progressive disclosure)**: 전체 그래프를 스냅샷당 1회만 계산하고, 화면에는 "보이는 노드"만 레이아웃. 모든 자식은 부모 펼침에 가려지며, 초기 상태는 예산(80노드) 안에서 디렉토리를 BFS로 자동 펼친 상태. 노드의 `+N` 버튼 또는 더블클릭으로 토글.
  - **폭 기준 wrap 트리 레이아웃(`treeLayout.ts`)**: dagre TB는 형제를 전부 한 줄에 나열해 fan-out 큰 트리가 수천 px 폭의 한 줄 스트립이 된다(140개 디렉토리만으로도 판독 불가). 자식 블록을 폭 기준 greedy 줄바꿈으로 감싸 블록 비율을 ≈2.4:1로 유지하는 커스텀 레이아웃으로 교체했다. 이로써 `layoutEngine.ts`(dagre)는 이 화면에서 더 이상 사용되지 않는다(파일은 유지).
  - **검색 확대**: 검색은 숨겨진 노드 포함 전체 그래프 대상. Enter/이동 시 매치 노드의 조상 경로를 자동으로 펼치고, 해당 노드(+직계 자식)가 화면에 꽉 차게 fitView(maxZoom 1.6).
  - **다크 재디자인**: DashboardPage의 `--rf-*` 다크 토큰을 그대로 가져와 페이지·노드·엣지·Controls·MiniMap을 통일. 노드 타입 색상은 다크 배경 기준으로 밝게 조정(#60a5fa/#34d399/#fbbf24/#c084fc).
  - MiniMap과 캔버스 좌상단 "파일까지 펼치기 / 디렉토리만 보기" 액션 추가.

## 3. 결과 (Result)
- **주요 변경 사항**:
    - `src/utils/treeLayout.ts` (신규): 폭 기준 wrap 트리 레이아웃.
    - `src/dummy/astDummyDataLarge.ts` (신규) + `src/services/test_astDataService.ts`: 실제 스냅샷 규모(dirs 140 / files 486 / entities ~2,600, tests 51개 파일)의 결정적 대용량 더미 생성기. `snapshotId=4`로 접근 시 사용 — 가독성 비교 검증용.
    - `src/components/flow/AstFlowCanvas.tsx`: 펼침 상태(`expandedIds`) 기반 가시 노드 계산 + 부분 레이아웃, 예산 기반 초기 자동 펼침, 검색 조상 자동 펼침 + focus fitView(노드 측정 완료 후 실행), MiniMap/Panel 추가, 다크 엣지 스타일.
    - `src/components/flow/AstNode.tsx` / `.module.css`: `+N`/`−` 펼침 버튼 추가, 다크 노드 카드 디자인.
    - `src/pages/VisualizationPage/VisualizationPage.tsx` / `.module.css`: 다크 토큰 전환, 노드 pill을 `표시/전체`로 변경, canvas 콜백 useCallback 고정.
    - `src/interface/flow.interface.ts`: `FlowNodeData`에 `expandable/expanded/hiddenChildren/onToggle` 추가.
    - `src/components/flow/AstFlowCanvas.module.css`: Controls/MiniMap 다크 오버라이드, 액션 버튼 스타일.
- **검증 결과**:
    - [x] `npm run build` 통과
    - [x] Playwright(시스템 Chrome)로 `/visualization/4` 대용량(140/486/~2,600) 구동: 초기 자동 펼침 뷰(80노드), 검색 Enter 시 접힌 test 파일까지 자동 펼침 + 화면 꽉 차게 확대, tests 더블클릭 시 51개 파일 wrap 그리드 노출, "파일까지 펼치기"(626노드) 블록 배치 확인 (콘솔 에러 0)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: 최초 구현에서 "Maximum update depth exceeded"로 화면이 통째로 빈 채 크래시. React Flow `StoreUpdater`는 layout effect에서 prop identity 변경마다 store를 동기 갱신하는데, 페이지가 canvas에 인라인 콜백을 넘기면 매 렌더마다 identity가 바뀌어 canvas 내부 effect 재발화 → 페이지 setState → 재렌더 순환이 생겼다.
- **해결 방법**: (1) 페이지에서 canvas로 넘기는 콜백 전부 `useCallback` 고정, (2) `fitViewOptions`/`proOptions`/Controls·MiniMap style 등 ReactFlow에 넘기는 객체·함수 prop을 모듈 상수로 호이스팅, (3) 상태 보고 effect에 동일값 가드 추가. **React Flow를 쓰는 컴포넌트에는 인라인 객체/함수 prop을 넘기지 말 것.**
- **추가 문제**: 펼침/검색 직후 fitView가 빈 화면으로 가는 증상 — 새로 추가된 노드가 아직 측정(measure)되기 전에 fitView가 실행되면 경계 계산이 어긋난다. fit 요청을 seq 상태로 만들고 대상 노드의 `measured.width`가 채워진 뒤에만 소비하도록 게이트를 추가해 해결. **React Flow에서 새 노드 대상 fitView는 반드시 측정 완료 후 실행할 것.**
- **다음 단계**: 이 화면 위에 smell 오버레이·품질 점수 작업(`2026-08-30_visualization_quality_overlay_plan.md`) 진행. 실데이터(`astDataService`) 전환 시 대형 스냅샷에서 성능 재확인.
