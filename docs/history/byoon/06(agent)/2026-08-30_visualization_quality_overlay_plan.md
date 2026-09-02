# 상세 시각화(구조 그래프) 품질 오버레이 고도화 계획

## 1. 작업 개요
- **일시**: 2026-08-30
- **작업자**: byoon (agent)
- **대상**: `code-vi-internal/code-vi-front` 상세 시각화 화면 (`/visualization/:snapshotId`)
- **참고**: https://platform.refactory.store/visualization/4 (RE:FACTORY 시각화 화면)

## 2. 목표

방대한 소프트웨어의 정적 분석 지표를 디렉토리 구조 그래프 위에서 한눈에 보여준다.

1. 기존 디렉토리 → 파일 → 클래스 → 함수 구조 그래프에 `advanced-pyexamine` 코드 스멜 결과를 오버레이한다.
2. 노드(특히 디렉토리/파일)마다 품질 점수를 계산해서 그래프 안에 직접 표시한다.
3. 화면 상단에 프로젝트 전체 품질 점수를 표시한다.

대시보드 연동 계획(`code-vi-front/docs/smell-analysis-dashboard-integration-plan.md`)이 "표 형태 요약"이라면, 이 작업은 "구조 그래프 위 시각화"다. 두 작업은 API client와 타입을 공유한다.

## 3. 현재 화면 구조

```text
VisualizationPage (/visualization/:snapshotId)
  toolbar        뒤로가기, 스냅샷 제목, 노드 수 pill, 노드 검색
  AstFlowCanvas  React Flow + dagre 레이아웃 (astSnapshotToFlow 결과)
    AstNode      노드 emoji/label/meta 태그, class 노드는 CK metrics popover
  노드 상세 패널   선택 노드 meta + CK metrics
  범례            노드 타입별 색상 안내
```

관련 파일:

| 파일 | 역할 |
| --- | --- |
| `src/pages/VisualizationPage/VisualizationPage.tsx` | 페이지, 툴바, 상세 패널, 범례 |
| `src/components/flow/AstFlowCanvas.tsx` | snapshot → nodes/edges 변환, dagre 레이아웃, 클릭/검색 |
| `src/components/flow/AstNode.tsx` | 커스텀 노드 렌더링 |
| `src/utils/astToFlow.ts` | `astSnapshotToFlow(snapshot)` 변환기 |
| `src/utils/layoutEngine.ts` | dagre 레이아웃 (`NODE_WIDTH=200`) |
| `src/interface/flow.interface.ts` | `FlowNodeData` 등 flow 타입 |

## 4. 핵심 설계

### 4.1 데이터 결합: AST 노드 ↔ smell finding 매핑

PyExamine finding은 `filePath`, `lineStart`, `lineEnd`, `entity`를 가진다.
현재 flow 노드에는 파일 전체 경로가 없다 (`meta.fileName`뿐). 따라서:

1. `astToFlow.ts`의 `processDir` 재귀에서 디렉토리 경로를 누적해 파일 노드 `meta.fullPath`(예: `advanced_pyexamine/analyzer.py`)를 채운다.
2. finding → 노드 매핑 규칙:
   - **파일 노드**: `finding.filePath`와 `fullPath` 정확 일치 → 실패 시 suffix 일치(`endsWith`) 폴백. PyExamine 경로는 analyzer 컨테이너 내부 `projectPath` 기준이라 루트 prefix가 다를 수 있기 때문.
   - **클래스/함수 노드**: 같은 파일 안에서 `finding.entity === node.label`이고 `lineStart~lineEnd`가 노드의 `startLine~endLine` 범위와 겹치면 해당 노드에도 부착. 매칭 실패 시 파일 노드에만 부착.
3. 매핑에 실패한 finding 수를 반환해서 화면에 "미매핑 N건"으로 표시한다 (조용히 사라지지 않게).

### 4.2 트리 롤업 (디렉토리 집계)

디렉토리 노드는 하위 파일/서브디렉토리의 smell을 집계한 값을 가진다.

```ts
smells: { high: number; medium: number; total: number; topNames: string[] }
```

방대한 프로젝트에서 "어느 디렉토리가 문제인지"를 상위 레벨에서 바로 보이게 하는 것이 이 작업의 핵심이다.

### 4.3 품질 점수 산정 (1차 제안 공식)

- **파일 노드**: `score = max(0, 100 - (high × 10 + medium × 3))`
- **디렉토리 노드**: 하위 파일 점수의 단순 평균 (파일 없는 디렉토리는 하위 디렉토리 평균)
- **전체 점수**: 루트 디렉토리 점수

공식은 의도적으로 단순하게 시작한다. 가중치(10/3)와 LOC 정규화 여부는 팀 합의로 조정하며, 계산은 `smellOverlay.ts` 한 곳에만 둔다. 대시보드의 SonarQube 기반 `qualityScore`(`buildSnapshotOverview.ts`)와는 **별도 점수**로 표시하고 섞지 않는다 (기존 대시보드 계획과 동일한 분리 원칙).

점수 등급 색상: `90~100` 안정(green) / `70~89` 주의(amber) / `0~69` 위험(red).

### 4.4 렌더링 방식

smell/score 데이터는 dagre 레이아웃이 끝난 노드 데이터에 **merge만** 한다. 노드/엣지 구조와 레이아웃은 건드리지 않으므로 기존 검색·포커스·성능 특성이 그대로 유지된다. snapshot과 smell job이 모두 로드됐을 때 `useMemo`로 1회 계산한다.

## 5. UI 고도화 계획

### 5.1 노드 오버레이 (AstNode)

- **severity ring**: high smell 보유 노드는 빨간 테두리, medium만 있으면 amber 테두리. 기존 `--node-accent` 패턴 재사용.
- **smell badge**: 노드 우상단에 count 뱃지 (`🔥 3` 형태). 디렉토리 노드는 롤업 수치.
- **점수 뱃지**: 디렉토리/파일 노드 meta 줄에 점수 표시 (`92점`) — "그래프 사이에 품질 점수"의 실체.
- **popover 확장**: 파일/클래스/함수 노드 선택 시 해당 노드에 부착된 smell 이름 목록을 CK metrics popover와 같은 방식으로 노출.

### 5.2 보기 모드 토글 (툴바)

```text
[ 구조 ] [ 품질 히트맵 ]
```

- **구조 모드**: 현재와 동일 + ring/badge만 추가.
- **품질 히트맵 모드**: 노드 배경을 점수 등급 색으로 tint. 방대한 그래프를 축소해서 봤을 때 문제 영역이 색 덩어리로 보이는 것이 목적.

### 5.3 툴바 전체 점수 pill

기존 노드 수 pill 옆에 전체 품질 점수 pill을 추가한다.

```text
📁 12  📄 48  🔷 96   |   품질 82점   🔥 smell 43 (high 11)
```

클릭 시 상세 패널에 프로젝트 요약(severity/rule breakdown)을 표시한다.

### 5.4 상세 패널 확장

노드 선택 시 기존 meta/CK metrics 아래에 해당 노드의 findings 목록을 추가한다.

| 항목 | 필드 |
| --- | --- |
| Rule | `name` |
| Severity | `severity` |
| Line | `lineStart`–`lineEnd` |
| Message | `message` (예: "Extract Method") |

디렉토리 노드 선택 시에는 하위 집계(rule별 count)를 표시한다.

### 5.5 필터/범례

- 툴바에 severity 필터 chip (`All / High / Medium`) — 선택 시 해당 severity smell이 없는 노드를 dim 처리 (제거하면 레이아웃이 무너지므로 dim만).
- 범례에 severity ring 색상과 점수 등급 색상 항목 추가.

### 5.6 상태 처리

| 상태 | UI |
| --- | --- |
| smell 조회 중 | 툴바 pill 자리에 로딩 표시. 그래프는 smell 없이 먼저 렌더 |
| 저장된 job 없음 | "코드 스멜 분석 이력 없음" pill. 오버레이 기능 비활성 |
| 최신 job FAILED | "최근 분석 실패" pill + errorCode 툴팁 |
| 미매핑 finding | "미매핑 N건" 안내 (패널 하단) |

smell API 실패가 구조 그래프 렌더링을 막지 않는 것이 원칙이다.

## 6. 사용할 Backend API

계약: `code-vi-internal/code-vi-back/docs/smell-analysis-frontend-contract.md`

1. `GET /api/smell-analyses?teamProjectId={id}&status=SUCCESS&limit=1&offset=0` — 최신 job 확인 (`snapshot.teamProjectId` 사용)
2. `GET /api/smell-analyses/{jobId}` — summary + 전체 findings (오버레이는 전체 findings가 필요하므로 detail API를 사용, findings 페이지네이션 API는 상세 패널 확장 시에만 고려)

snapshot과 smell job의 직접 연결(`codeAnalysisId`/`buildNumber`)은 아직 없으므로 1차에서는 "해당 팀 프로젝트의 최신 SUCCESS job"을 사용하고, 화면에 분석 시각(`completedAt`)을 표시해서 스냅샷과 시점이 다를 수 있음을 드러낸다.

## 7. 신규/수정 파일

### 신규 (대시보드 계획과 공유하는 파일은 ★)

| 파일 | 역할 |
| --- | --- |
| ★ `src/interface/smellAnalysis.interface.ts` | API 응답 타입 (`SmellAnalysisDetail`, `SmellAnalysisFinding`, `SmellSummary` 등) |
| ★ `src/services/smellAnalysisService.ts` | `listSmellAnalyses`, `getSmellAnalysis` (기존 `api.ts` axios 재사용) |
| `src/hooks/useSmellOverlay.ts` | teamProjectId → 최신 job detail 로드, loading/empty/error 상태 |
| `src/utils/smellOverlay.ts` | finding↔노드 매핑, 트리 롤업, 점수 계산. **순수 함수로 작성해 단위 테스트 대상** |

### 수정

| 파일 | 수정 내용 |
| --- | --- |
| `src/interface/flow.interface.ts` | `FlowNodeData`에 `smells?`, `qualityScore?` 추가, `meta.fullPath` 추가 |
| `src/utils/astToFlow.ts` | 디렉토리 경로 누적 → 파일 노드 `meta.fullPath` 채움 |
| `src/components/flow/AstNode.tsx` / `.module.css` | severity ring, smell badge, 점수 뱃지, smell popover |
| `src/components/flow/AstFlowCanvas.tsx` | smell 데이터 merge, `viewMode`/`severityFilter` props |
| `src/pages/VisualizationPage/VisualizationPage.tsx` / `.module.css` | smell 데이터 로드, 모드 토글, 점수 pill, 상세 패널 findings, 범례, 상태 처리 |

## 8. 구현 순서

```text
1. smellAnalysis.interface.ts + smellAnalysisService.ts
   → 검증: 저장된 job(teamProjectId=1, total=43) 콘솔 조회 확인
2. astToFlow.ts에 fullPath 추가 + smellOverlay.ts (매핑/롤업/점수)
   → 검증: smellOverlay 단위 테스트 (정확 일치, suffix 폴백, entity/line 매핑, 롤업, 점수, 미매핑 카운트)
3. useSmellOverlay.ts + VisualizationPage 데이터 연결 + 툴바 점수 pill
   → 검증: 로컬 화면에서 전체 점수/smell count가 backend summary와 일치
4. AstNode ring/badge/점수 뱃지 + 범례
   → 검증: high/medium 노드 색 구분, 라이트 캔버스에서 가독성 확인
5. 품질 히트맵 모드 토글 + severity 필터(dim)
   → 검증: 모드 전환 시 레이아웃 불변, 축소 화면에서 문제 영역 식별 가능
6. 상세 패널 findings 목록 + 상태 처리(로딩/없음/실패/미매핑)
   → 검증: 노드별 finding이 filePath/line과 일치
7. npm run build 통과 + 기존 화면(검색, 노드 포커스, 대시보드 진입) 회귀 확인
```

## 9. 주의사항 및 리스크

1. **더미 데이터 사용 중**: `VisualizationPage`는 현재 `test_astDataService`(더미)를 import한다. 더미 AST와 실제 smell 결과는 `filePath`가 맞지 않아 매핑이 0건이 된다. → 개발 단계에서는 더미 smell fixture를 함께 두고, 통합 검증은 실제 `astDataService` + 저장된 job으로 진행. 실서비스 전환 시점은 팀 결정 필요.
2. **경로 prefix 불일치**: PyExamine `filePath`는 컨테이너 내부 `projectPath` 기준. suffix 매칭 폴백 + 미매핑 카운트 노출로 대응.
3. **테마**: 이 페이지는 라이트 글래스 테마(`--rf-bg:#ebf5fb` 로컬 재정의)라서 대시보드 다크 테마의 `--rf-danger`/`--rf-amber`를 그대로 쓰면 안 보일 수 있다. severity/점수 색은 라이트 캔버스 기준으로 별도 토큰을 정의한다.
4. **성능**: 매핑/롤업은 snapshot+job 로드 완료 시 `useMemo` 1회 계산. 노드 수가 수천 개여도 O(nodes + findings) 수준 유지.
5. **점수 공식은 잠정치**: 4.3 공식은 1차 제안. 화면에 "beta" 뱃지 또는 툴팁으로 산정 기준을 명시해서 SonarQube 점수와 혼동을 막는다.

## 10. 이번 범위 제외

- smell 분석 실행 버튼 (조회 전용)
- SonarQube 품질 점수와의 통합 점수
- snapshot ↔ smell job 자동 연결 (buildNumber/codeAnalysisId 저장 흐름)
- finding 상세 모달, 코드 뷰 연동
- DiagramPreviewSection(대시보드 mock 미니 그래프)의 실데이터 교체 — 이 계획 완료 후 후속 작업으로 분리

## 11. 검증 계획

사전 조건: CodeVi backend(`localhost:13000`) + advanced-pyexamine-service 실행, 저장된 SUCCESS job 1건 이상 (기존 검증 데이터: `teamProjectId=1, total=43, high=11, medium=32`).

확인 항목:

- `/visualization/:snapshotId` 진입 시 기존 그래프/검색/포커스가 깨지지 않는다.
- 전체 점수 pill과 smell count가 backend summary와 일치한다.
- high smell 파일 노드에 빨간 ring과 count 뱃지가 표시된다.
- 디렉토리 노드 점수가 하위 파일 점수 평균과 일치한다.
- 히트맵 모드에서 축소 시 문제 디렉토리가 색으로 식별된다.
- 노드 선택 시 상세 패널에 해당 노드 findings가 표시된다.
- smell job이 없거나 실패해도 구조 그래프는 정상 렌더링된다.
- `npm run build` 통과.
