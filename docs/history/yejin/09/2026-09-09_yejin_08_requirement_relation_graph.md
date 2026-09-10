# 요구사항-코드 관계 그래프 (yejin_08 Phase 1)

## 1. 작업 개요
- **일시**: 2026-09-09
- **작업자**: yejin + Claude (Opus 5)
- **대상**: `code-vi-internal/code-vi-front` — `components/RelationshipGraph`, `utils`, `interface`,
  `pages/ProjectDetail/RequirementDetailModal`

## 2. 의도 (Intent)
- **작업 동기**: 요구사항 상세의 "매칭된 코드 요소"가 평면 텍스트 목록이라 파일/클래스/함수의
  소속 관계와 유사도 분포가 드러나지 않았다. jej_23에서 "1차 제외, 후순위 검토"로 유예했던
  RelationshipGraph를 회수한 작업이다(`docs/specs/jej_23_reqflow_full_feature_roadmap.md:386`).
- **디자인 결정**:
  - **순수 SVG 채택** — 프로젝트에 `@xyflow/react`와 `dagre`가 이미 있지만, 이 그래프는 노드 위치가
    고정된 소형 다이어그램(요구사항 1 : 파일 N)이라 레이아웃 엔진과 캔버스 상호작용(팬/줌)이 불필요하다.
    `AstFlowCanvas`(569줄)의 무게를 끌어오는 대신 좌표를 직접 계산했다.
  - **`FlowNodeData` 재사용 안 함** — 커밋 `3fe4bdc`에서 `entityId: number`가 필수 필드로 추가돼
    AST 도메인에 더 강하게 결합됐다. 요구사항 노드는 그 제약과 무관하므로 별도 타입을 뒀다.
  - **서버 변경 없이 중첩 구조 확보** — `code-mapping.service.ts:82-108`이 class/function 후보에도
    자기가 속한 파일 경로를 `path`로 넣어주기 때문에, `path` 그룹핑만으로 "파일 + 하위 함수" 구조가
    나온다. API를 새로 파지 않았다.
  - **유사도 3색은 테마 토큰화하지 않음** — 범례와 1:1로 묶인 의미론적 인코딩이라
    라이트/다크에서 같은 색이어야 한다. 나머지 노드/텍스트는 `--internal-*` 토큰을 쓴다.
- **참고 문서**: `docs/specs/yejin_08_requirement_relation_graph.md`

## 3. 결과 (Result)
- **주요 변경 사항**:
  - `src/interface/relationshipGraph.interface.ts` (신규): `CodeMatchDetail`, `ConnectionStrength`,
    `CodeMatchStatus`
  - `src/utils/relationshipGraph.ts` (신규): `getConnectionStrength`/`getConnectionStrokeWidth`/
    `getConnectionColor`/`getConnectionDashArray` + 어댑터 `buildCodeMatchDetails`
    (평면 `MatchDetailItem[]` → 파일 단위 중첩, score 0~100 → 0~1 정규화, 점수 내림차순 정렬)
  - `src/components/RelationshipGraph/RelationshipGraph.tsx` (신규): 순수 SVG
    `viewBox="0 0 700 420"`. 연결선 → 요구사항 노드 → 파일 노드/함수 서브노드 순으로 그려
    선이 노드 뒤로 깔리게 했다. 범례는 SVG 밖 HTML(`<ul>`) — 420px 안에 파일 노드 5개가
    꽉 차서 자리가 없다.
  - `src/components/RelationshipGraph/RelationshipGraph.module.css` (신규)
  - `src/pages/ProjectDetail/RequirementDetailModal.tsx`: 영향분석 섹션의 매칭 목록 **위**에
    그래프 배치. `selectedFile` 상태 추가 — 그래프 노드 클릭 시 하단 목록의 같은 경로 항목이
    함께 강조된다(재클릭 시 선택 해제). 요구사항이 바뀌면 선택을 초기화한다.
  - `src/pages/ProjectDetail/RequirementDetailModal.module.css`: `.graphBlock`, `.matchItemSelected`

- **레퍼런스 대비 변경 3건**:
  1. `buildNumber` 필드 제거 — `ValidationDetail`에 소스가 없다. 값을 지어내는 대신 뺐다.
  2. `status`는 유사도에서 파생 — 서버가 주지 않는다(`≥0.85 linked` / `≥0.4 partial` / 그 외 `missing`).
  3. `onSelectFile`이 `displayName` 대신 `codeFileId`(=경로)를 전달 — `index.ts` 같은 동명 파일이
     여러 경로에 있을 때 선택이 뒤엉키는 버그를 피하기 위해서다.

- **검증 결과**:
  - [x] Lint 통과 (`eslint` 4개 파일 무출력)
  - [x] Typecheck 통과 (`tsc -b`)
  - [x] Build 통과 (`vite build`, 983 modules)
  - [x] `/verify` 스탬프 발급
  - [x] **브라우저 실검증 완료** — Playwright 헤드리스 크로미움으로 실제 앱(`vite dev`)을 띄우고
    `/dashboard/1` → 요구사항 카드 → 상세 모달 경로를 직접 클릭해 확인했다.
    네트워크 응답만 스텁하고 App/라우팅/모달/서비스/axios는 전부 실제 코드가 돌았다.
    - 파일 노드 3개 렌더 (31% 1건은 숨김, 범례에 "1건"으로 집계)
    - 연결선 실측: `#22C55E`/3/실선, `#0064FF`/2/실선, `#F59E0B`/1/`dasharray="4 4"` — 명세 일치
    - 함수 서브노드 상위 2개만 렌더 (71% 3번째는 잘림), `basename` 폴백 동작(crypto.ts)
    - 노드 클릭 → SVG 노드 1개 선택 강조 + 같은 경로의 목록 항목 5행 동시 강조
    - 빈 상태 2종: 매칭 0건 → 블록 자체 미렌더 / 전부 40% 미만 → 빈 상태 메시지
    - console error 0건

## 3-1. Phase 2 — 매핑 카드 배치 (같은 날 추가)

- **의도**: Phase 1의 배치(요구사항 상세 모달)가 원래 의도와 달랐다. 목표 위치는 개요 탭의
  "요구사항-코드 매핑" 카드였고, 그 카드는 그때까지 "N개 중 M개 매핑됨" 한 줄이 전부였다.
- **설계 결정**:
  - `mapping-detail`이 요구사항 단위 API라 프로젝트 전체를 한 장에 그릴 수 없다 →
    드롭다운으로 대상 요구사항을 고르고 선택 시마다 1건 조회. 기본값은 매핑 점수 최상위.
  - `matchCount > 0`인 요구사항만 드롭다운에 올린다 — 미매핑 요구사항은 그릴 간선이 없다.
  - 모달 그래프는 유지. 카드는 프로젝트 전체 조망, 모달은 개별 심층 보기로 역할이 갈린다.
  - **상태를 전부 파생값으로 뺐다.** 이 레포의 `react-hooks/set-state-in-effect` 규칙이
    effect 본문의 동기 setState를 막는다(초기값과 다른 값을 넣을 때 걸린다).
    선택 요구사항/선택 파일/로딩/에러를 모두 effect 동기화 대신 렌더 시점 파생으로 계산했고,
    응답에 `requirementId`를 실어 늦게 도착한 다른 요구사항의 응답이 그려지지 않게 했다.
- **변경 파일**: `pages/ProjectDetail/MappingGraphSection.tsx`(신규),
  `MappingGraphSection.module.css`(신규), `ProjectDetail.tsx`(카드에 섹션 배선)
- **레이아웃**: 카드가 이미 전체 폭이었다(`dashboardGrid`가 `grid-template-columns: 1fr`).
  2단 그리드로 짐작하고 폭 확장을 계획했지만 CSS를 확인해 불필요함을 알았다 — 변경 없음.
- **브라우저 검증**: 기본 선택 REQ-1(점수 78 최상위) ✓ / 미매핑 REQ-3은 드롭다운 제외 ✓ /
  REQ-2 전환 시 그래프 교체(노드 2개, `#0064FF` 실선 + `#F59E0B` 점선) ✓ / 모달 그래프 유지 ✓ /
  console error 0건 ✓

## 3-2. Phase 3 — 주변 디자인과 통일 + 제목 잘림 제거 (같은 날)

- **문제**: "이식한 게 티가 난다"는 피드백. 원인은 레퍼런스가 들고 온 색(`#22C55E`/`#0064FF`/
  `#F59E0B`/`#9CA3AF`)이 인터널 다크 테마와 무관한 팔레트였다는 것.
- **해결 — 앱이 이미 쓰는 4단 점수 팔레트를 그대로 채택**:
  | 강도 | 색 | 앱에서 같은 색을 쓰는 곳 |
  |---|---|---|
  | 강함 ≥85% | `rgba(110, 231, 183, 0.92)` | 도넛 `implemented`, 진척링 A등급 |
  | 보통 ≥70% | `rgba(159, 231, 240, 0.92)` | 도넛 `mostly`, 진척링 B등급, `--internal-accent` |
  | 약함 ≥40% | `rgba(251, 191, 36, 0.92)` | 도넛 `partial`, 진척링 C등급 |
  | 숨김 <40% | `rgba(235, 245, 251, 0.18)` | 도넛 `unimplemented` |
  임계값(85/70)이 `OverallProgressRing`의 A/B/C 구간과 이미 일치해 그대로 맞아떨어졌다.
  색은 `CONNECTION_COLORS`로 한곳에 모아 범례와 선이 같은 출처를 쓰게 했다.
- **그 외 통일**: 요구사항 노드/선택 상태를 파란색 대신 accent 톤으로, 파일 노드는
  `--internal-surface-elevated` + `--internal-border`, 범례는 `StatusDistributionDonut`의
  타이포/구조(12px, `legendLabel` = text-2, `legendValue` = 굵은 text)를 따랐다.
  캔버스 바탕은 불투명 `--internal-bg` 위에 카드와 같은 밝기의 흰색 레이어를 얹어,
  모달의 비침 문제를 막으면서도 주변 카드와 같은 톤이 되게 했다.
  모달의 `.matchItemSelected`도 파란색에서 accent로 통일했다.
- **제목 잘림 제거**: "요구사항 글자가 잘리면 안 된다"는 지적. 요구사항 노드를 고정 높이
  72px에서 **제목 줄 수에 따라 늘어나는 높이**로 바꿨다(`wrapToLines`가 더 이상 자르지 않는다).
  캔버스 높이도 노드 높이를 반영한다. 폭은 140 → 200으로 넓혔다.
  추가로 어절(공백) 단위로 끊어 '등급'이 '등/급'으로 갈라지지 않게 했고, 한 어절이 한 줄보다
  길 때만 글자 단위로 쪼갠다(`splitLongWord`).
  파일명·경로는 여전히 폭 초과 시 말줄임하되 `<title>` 툴팁으로 전문을 볼 수 있다.
- **검증**: 61자 제목으로 확인 — 5줄로 접히고 말줄임표 없음, 글자 손실 없음,
  어절 중간 끊김 없음. 연결선 색이 앱 팔레트로 렌더됨. console error 0건.

## 3-3. Phase 4 — FilterDropdown 겹침/폭 버그 수정 (같은 날)

- **문제**: 매핑 카드의 요구사항 선택 드롭다운이 제목 길이에 따라 깨졌다.
  짧은 제목을 고른 상태에서 목록을 열면 긴 옵션이 접히면서 이웃 옵션 위에 겹쳐 찍혔고,
  긴 제목을 고르면 트리거가 카드 폭 가까이 늘어나 레이아웃이 흔들렸다.
- **원인 3가지** (전부 `FilterDropdown`의 기존 스타일):
  1. `.option { height: 32px }` 고정 — 두 줄 이상이면 버튼 밖으로 흘러 이웃과 겹친다.
  2. `.list { left: 0; right: 0 }` — 목록 폭이 트리거에 묶여 긴 라벨이 강제로 접힌다.
  3. `.select`에 상한이 없어 flex 안에서 내용만큼 늘어난다.
- **수정**: `.option`은 `min-height` + 세로 패딩 + `word-break: keep-all`(한글 어절 유지),
  `.list`는 `min-width: 100%` + `width: max-content` + 상한/스크롤,
  `.select`는 `max-width: 100%`. 트리거에는 `title` 속성을 붙여 말줄임돼도 전문을 볼 수 있게 했다.
  매핑 카드 쪽은 `.selectWrap`(min 220 / max 420px)으로 폭을 고정해 선택이 바뀌어도
  컨트롤 크기가 변하지 않게 했다.
- **이 버그는 관계 그래프만의 문제가 아니었다.** `FilterDropdown`은 요구사항 상세 모달의
  "대상 요구사항 선택"에서도 제목을 라벨로 쓰고 있어 같은 증상이 이미 있었다 — 함께 고쳐졌다.
- **실측 검증**: 짧은 제목/긴 제목 양쪽에서 목록을 열어 옵션 사각형의 교차를 계산.
  겹침 0건, 트리거 폭 변동 0px(420 고정), 목록 520px, 긴 옵션만 33 → 52px로 늘어남,
  목록이 카드 밖으로 넘치지 않음. 모달 드롭다운도 겹침 0건.

## 3-4. Phase 5 — 요구사항 상세 모달 배경 불투명화 (같은 날)

- **문제**: 모달을 열면 뒤 대시보드의 글자가 모달 본문 글자와 겹쳐 읽혔다.
- **원인**: `.modal`의 배경이 `--internal-surface`(= `rgba(255,255,255,0.03)`)라 사실상 투명했고,
  `.overlay`도 `rgba(5,8,12,0.6)`뿐이라 뒤를 가리지 못했다.
- **이 문제는 관계 그래프 때문에 생긴 게 아니다.** 모달 전체(영향분석 텍스트, 매칭 목록 포함)가
  원래 그랬고, 선과 작은 % 라벨이 많은 그래프가 들어오면서 눈에 띄게 됐을 뿐이다.
  Phase 1에서 캔버스만 불투명하게 덮어 증상을 가렸는데, 근본 원인을 고치는 게 맞았다.
- **수정**: `.modal` 배경을 불투명 `--internal-bg` 위에 같은 밝기(3%)의 흰색 레이어를 얹는 방식으로
  바꿔, 페이지 위 카드와 같은 톤을 유지하면서 바닥을 막았다. `.overlay`는 `0.6 → 0.72` +
  `backdrop-filter: blur(6px)` — 떠 있는 패널에 블러를 쓰는 건 `FilterDropdown`의 목록과 같은 관용구다.
- **검증**: 모달의 계산된 배경색이 `rgb(18, 22, 25)`(알파 없음)로 확인됐고, 스크린샷에서
  뒤 대시보드 텍스트가 전혀 비치지 않는다.

## 4. 회고 및 공유 사항 (Retrospective)
- **브라우저 검증에서 잡은 결함 3건 (수정 완료)**:
  1. **한글 제목이 노드 박스를 넘쳤다.** 글자 수 기반 `truncate(title, 16)`는 한글이 전각이라
     16자 × 12px = 192px로 140px 박스를 그대로 초과했다. → 전각/반각을 구분해 폭을 어림하는
     `measureWidth`/`truncateToWidth`/`wrapToLines`를 만들고 제목을 2줄로 접었다.
  2. **함수 서브노드가 다음 파일 노드를 침범했다.** 레퍼런스 좌표(offset 52 / gap 18)로는
     2번째 줄이 y+70에 놓이는데 다음 노드가 y+72에서 시작해 겹쳤다. → offset 56 / gap 11 /
     폰트 9px로 24px 띠 안에 넣었다.
  3. **모달이 반투명이라 뒤 페이지가 그래프에 비쳤다.** 캔버스 배경이 `--internal-surface`
     (rgba 255,255,255,0.03)여서 뒤 위젯 텍스트가 선·라벨과 겹쳐 읽혔다. → 캔버스만
     `--internal-bg` 불투명으로. (모달 자체의 반투명은 이 앱 전역 스타일이라 손대지 않았다.)
  - 추가 개선: viewBox 높이를 노드 수에 맞춰 계산하도록 바꿨다. 고정 420은 top-5가 다 찼을 때
    기준이라, 흔한 3건짜리에서는 아래 절반이 빈 채로 남았다.

- **발생한 문제**: 첫 `/verify`가 내 변경과 무관하게 실패했다 —
  `DiffHunkReview.tsx(1,27): error TS2307: Cannot find module 'diff'`.
  `diff@^5.2.2`가 `package.json`에는 있는데 `node_modules`에 없었다.
- **해결 방법**: `cd code-vi-internal/code-vi-front && npm install`.
  최근 pull(`3fe4bdc` 이전 어딘가)에서 들어온 의존성이 로컬에 반영되지 않은 상태였다.
  **다음 작업자도 pull 후 같은 증상을 겪을 수 있으니 `npm install`을 먼저 돌릴 것.**
- **남은 확인**: 위 검증은 네트워크를 스텁한 것이라, 실제 백엔드가 주는 mapping-detail 데이터로는
  아직 보지 못했다. `ValidationDetail` 행이 생기려면 AST 스냅샷 + 외부 파서 파이프라인이 돌아야 해서
  로컬에서 재현하지 못했다. 스테이징에 붙는 시점에 실데이터로 한 번 더 볼 것.
- **다음 단계**:
  - 요구사항 **간** 의존관계(`depends_on`/`related`/`conflicts_with`/`duplicates`) 그래프는 이번 범위
    밖이다. 데이터는 `RequirementDependency`에 이미 있고 서버가 `depends_on` 순환을 막아
    DAG가 보장되므로(`requirement-dependency.service.ts:88-112`), dagre 계층 레이아웃을 그대로 쓸 수 있다.
  - 다만 프로젝트 전체 그래프를 그리려면 요구사항 N건에 대해 `:id/dependencies`를 N번 호출해야 한다
    (N+1). `GET /api/requirements/:teamProjectId/graph` 신설이 선행돼야 한다.
