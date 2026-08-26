---
id: jej_23_reqflow_full_feature_roadmap
status: done
owner: jej
created: 2026-08-05
history:
  - docs/history/jej/08/2026-08-05_jej_23_reqflow_full_feature_roadmap_phase7.md
  - docs/history/jej/08/2026-08-06_jej_23_reqflow_full_feature_roadmap_phase8.md
  - docs/history/jej/08/2026-08-06_jej_23_reqflow_full_feature_roadmap_phase9.md
  - docs/history/jej/08/2026-08-06_jej_23_reqflow_full_feature_roadmap_phase10.md
  - docs/history/jej/08/2026-08-06_jej_23_reqflow_full_feature_roadmap_phase11.md
  - docs/history/jej/08/2026-08-06_jej_23_reqflow_full_feature_roadmap_phase12.md
---

# Spec: 23_reqflow_full_feature_roadmap (ReqFlow 전체 기능 CodeVi 이식 로드맵)

> 대상: `code-vi-internal/code-vi-back`(`requirements` 모듈 확장), `code-vi-internal/code-vi-front`
> (`ProjectDetail`, `NewRequirement`, 신규 화면들)
> 원본: `C:/requirements-management-system`(ReqFlow) — React+Express PoC, 7개 화면
> (Dashboard/Requirements/Analysis/Validation/Documents/BuildHistory/Settings)
> 선행 spec: [jej_20](jej_20_requirements_first_project_flow.md)(Phase 1~6 완료),
> [jej_21](jej_21_existing_project_requirements_management.md)(완료) — 이 문서는 jej_20이
> "Phase 8, 후순위, 별도 승인 후 별도 spec"으로 미뤄둔 나머지 전체를 다룬다.

---

## 0. 사실 확인 (현재 상태)

### 0.1 CodeVi에 이미 구현된 것 (jej_20/21, 코드로 재확인)

- 백엔드 `requirements` 모듈(`code-vi-back/src/requirements/`): `Requirement`, `RequirementVersion`,
  `Baseline`, `AnalysisFinding`, `ValidationDetail`, `TraceabilityRecord` 엔티티 존재.
- `RequirementsController`: `POST /api/requirements`(생성), `POST /api/requirements/bulk`(CSV/AI 결과
  일괄 등록), `GET /api/requirements`(목록), `GET /api/requirements/:teamProjectId/summary`(집계),
  `POST /api/requirements/:teamProjectId/analysis/recompute`(중복/충돌/누락 findings 재계산),
  `PATCH/DELETE /api/requirements/:id`. 전부 `ProjectMemberGuard`/`RequirementOwnerGuard`로 멤버십 검증됨.
- `analysis-engine.ts`: ReqFlow `recompute.ts::buildAnalysisFindings`의 토큰 오버랩·키워드 휴리스틱을
  그대로 이식 완료(코드 무관, 텍스트 기반).
- 프론트: `/projects`(목록), `/projects/:id`(상세 — KPI 카드, AI 분석 카드, 마감 위젯, 요구사항 목록),
  `/code-insight/new/:teamProjectId/requirements`(직접 등록/AI 자연어/CSV 3방식 입력), dark cinematic
  테마 적용 완료.
- **아직 없는 것**: `implementationScore` 계산 로직(엔티티 컬럼은 있으나 채우는 코드 없음),
  `ValidationDetail`/`TraceabilityRecord`를 채우는 로직, 버전 이력·댓글·의존관계·영향분석 API,
  Documents/BuildHistory/Settings 화면 전부, `RequirementDetailPanel` 수준의 상세 편집 UI(현재
  `/projects/:id`는 목록 표시 위주).

### 0.2 ReqFlow 원본 — 화면별 기능 인벤토리 (소스 코드 직접 확인, README 아님)

> README(`requirements-management-system/README.md`)는 일부 구식 기술 설명(예: "JSON DB")을 포함하고
>있어 실제 코드(`server/db/store.ts` 등, Prisma+MariaDB)와 다르다. 아래는 `src/pages`, `src/components`,
> `server/routes`, `server/services`, `server/lib`, `prisma/schema.prisma`를 직접 읽어 확인한 내용이다.

#### Dashboard (`/`)
- 구성: Hero 진척률(SVG 도넛), KPI 카드 5개, 상태별 카운트 스트립, 마감 임박/지연 위젯, 최근 활동, 5단계
  라이프사이클 진척바, 상태 분포 파이차트, 요구사항별 커버리지 리스트, AI 인사이트 카드, 빌드 타임라인
  차트, 최근 검증 상세 카드.
- API: `GET /api/dashboard/projects/:id`(집계), `POST /api/analysis…/recompute`,
  `POST /api/validation…/recompute`. 실패 시 `mocks/data/*`로 폴백(이중 계산 경로 존재).
- **CodeVi 대응 — 정정**: `/projects/:id`에 포팅된 건 이 중 **KPI 카드 5개 중 일부(전체/기능·비기능/
  우선순위), AI 인사이트 카드, 마감 임박·지연 위젯뿐**이다(jej_20 Phase 6). **아직 포팅되지 않은 것**:
  Hero 진척률 도넛, 5단계 라이프사이클 진척바, 상태 분포 파이차트, 요구사항별 커버리지 리스트, 빌드
  타임라인 차트, 최근 활동 피드 — 전부 `implementationScore`(Phase 7)가 실값으로 채워져야 의미가 생기는
  것들이라 그때까지는 만들어도 "전부 0%"만 보였을 것(jej_20 Phase 6 설계 배경과 동일 이유). Dashboard를
  **별도 라우트(`/`)로 만들 필요는 없다**는 판단은 유지하되, 이 위젯들 자체는 §2 Phase 12에서 `/projects/:id`
  안에 채운다.

#### Requirements (`/requirements`, `/requirements/new`)
- 구성(3컬럼): 목록 패널(검색/필터/페이지네이션/CSV 내보내기) · 상세 패널(메타, 워크플로 상태 전이 버튼,
  베이스라인 지정, 수용기준, 태그, 버전 비교, 변경이력, 의존관계, 댓글 스레드) · 분석 패널(구현점수,
  유사도, 관련 코드파일, 추적성 링크, 영향 분석).
- 입력 화면(`NewRequirementPage`): 직접 등록 / AI 자연어 생성(텍스트·`.txt`/`.md` 업로드) / CSV 일괄
  가져오기 — 이미 CodeVi에 이식됨.
- API: 표준 CRUD + `.../versions`, `.../impact`, `.../comments`(서브리소스), PATCH 시 서버가 버전이력·
  activity 로그 자동 생성.
- **AI 생성의 실체**: `src/mocks/aiGeneration.ts::generateRequirementsFromText` — 입력 텍스트를
  **사용하지 않고** 1.5초 딜레이 후 고정된 `DEMO_OUTPUT` 3건을 반환한다. CodeVi 이식본(jej_20 Phase 4)도
  동일한 방식(휴리스틱/데모 고정값)을 그대로 유지하기로 이미 결정된 상태다.

#### Analysis (`/analysis`)
- 구성: 요약 카드 6개, high/critical 경고 카드, findings 테이블, 선택 finding 설명 패널.
- 로직(`recompute.ts::buildAnalysisFindings`): 요구사항 쌍 토큰 오버랩(자카드 근사) ≥0.55 → duplicate,
  고정 키워드 조합(보안/세션 관련) 동시 등장 → conflict, 5개 고정 키워드(로그인/회원가입/비밀번호
  재설정/예외 처리/테스트 케이스)가 프로젝트 전체에 하나도 없음 → omission, 추적성 링크 없음 →
  traceability_gap.
- CodeVi 대응: 로직은 이미 이식 완료(jej_20 Phase 6, `analysis-engine.ts`). **결정(이전 draft에서
  미정으로 남겨뒀던 것을 이번에 확정)**: 별도 `/analysis` 라우트는 만들지 않는다(Dashboard와 동일한 이유 —
  같은 데이터를 보여주는 화면을 늘리지 않음). 대신 `/projects/:id`의 AI 인사이트 카드를 "전체 보기"
  클릭 시 findings 테이블 + 우측 설명 패널이 펼쳐지는 형태로 확장한다(원본의 테이블+패널 UX를 페이지
  분리 없이 같은 화면 안에서 재현) — §2 Phase 12에서 다룬다. 원본의 "권장조치" 버튼(요구사항 병합/정책
  검토 등)은 클릭 시 `alert()`만 뜨는 미구현 상태였으므로, 포팅 시에는 버튼을 없애거나 "요구사항 상세로
  이동" 정도로 실제 동작하는 것만 남긴다.

#### Validation (`/validation`)
- 구성(3컬럼+하단): 목록 패널 · SVG 관계 그래프(RelationshipGraph, 노드=요구사항/코드파일, 선 굵기·색상=
  유사도) · 상세 패널(추정점수, 매칭파일, 누락로직, 수용기준 커버리지, AI설명, 빌드검증) · 코드 스니펫
  패널 · 그래프/트리/매트릭스/파일상세 4탭(`CodeAssociationSection`).
- 점수식: `calculateEstimatedScore = (Top-5 유사도평균×100)×0.6 + (수용기준 구현률평균)×0.4`.
- **유사도의 실체**: 실제 임베딩/코사인 유사도가 아니라 토큰 오버랩 휴리스틱(`overlapScore`) 또는
  `mocks/data/similarityScores.ts`에 미리 심어둔 고정값이다. UI 문구("코사인 유사도")가 구현과 불일치.
  코드 스니펫도 실제 파일 파싱이 아니라 `server/lib/snippets.ts`의 목업 라인 생성.
- CodeVi 대응: jej_20 Phase 7(설계만 되어있고 미구현)이 정확히 이 부분이다 — **다만 CodeVi는 실제
  `AstSnapshot`/`AstFile`/`AstClass`/`AstFunction` 데이터가 있으므로, ReqFlow처럼 가짜 코드 목업을
  비교하지 않고 실제 코드 구조와 비교할 수 있다.** 이 문서 Phase 7이 이를 구체화한다.

#### Documents (`/documents`)
- 구성: 문서종류 탭(SRS/PRD/BRS) + 요구사항 체크박스 선택 사이드바, 섹션별 미리보기(편집 가능), 섹션
  재생성 버튼, 품질 패널(점수/누락섹션/AI 제안), PDF/DOCX/Markdown "내보내기" 버튼.
- **문서 생성의 실체**: `src/mocks/documentGenerator.ts`의 **템플릿 채움**(선택된 요구사항 데이터를 고정
  섹션 구조 문자열에 끼워넣음). LLM 호출 없음.
- **내보내기 버튼은 완전 미구현**: 클릭 시 `alert('...Export (mock)')`만 뜬다. 실제 PDF/DOCX 생성은 별도
  라이브러리 도입이 필요한 작업이며, ReqFlow 자체 로드맵에도 "미구현"으로 명시되어 있다.

#### BuildHistory (`/build-history`)
- 구성: 요약 카드 4개, 타임라인/진척 차트, 빌드 테이블, 빌드 상세 패널, 요구사항별 진척 타임라인,
  "빌드 시뮬레이션" 버튼.
- **시뮬레이션의 실체**: 하드코딩된 커밋 메시지(`'feat: REQ-001 auth token refresh'`)와 파일 목록을 매번
  동일하게 전송하는 목업 트리거. 서버(`jenkins.ts::processJenkinsBuild`)는 커밋 메시지의 `REQ-\d{3}`
  정규식과 파일명 고정 키워드(`auth`, `login` 등 6개)로 영향 요구사항을 추론해 성공 +3 / 실패 −1로
  점수를 가감한다.
- CodeVi와의 관계: **CodeVi에는 이미 실제 Jenkins/GitHub 연동(`github-connect`, `jenkins.service.ts`)이
  있다.** ReqFlow의 "시뮬레이션"을 그대로 가져오면 가짜 빌드와 실제 빌드가 같은 화면에 섞이는 문제가
  생긴다(jej_20 1.3에서 이미 지적됨).
- **라우팅 결정(확정)**: 별도 `/build-history` 라우트를 만들지 않고 `/projects/:id`의 탭으로 통합한다
  (§1.2). CodeVi에 "프로젝트별 Jenkins 빌드 이력" 화면이 아직 없음을 확인했으므로(`Dashboard.tsx`는
  더미 데이터, `DashboardPage.tsx`/`SnapshotStrip.tsx`는 빌드 관련 로직 없음) 탭으로 합쳐도 기존 화면과
  중복되지 않는다.

#### Settings (`/settings`)
- 구성: 전부 읽기 전용 — 프로젝트/사용자 정보 카드, 베이스라인 목록, 외부 연동 상태.
- **연동 상태의 실체**: 실제 헬스체크가 아니라 DB 데이터 존재 여부 추정이며, Git 연동 상태는
  `connected: true`로 **하드코딩**되어 있다.

### 0.3 Prisma 스키마 → CodeVi 매핑 요약

| ReqFlow 모델 | CodeVi 대응 | 상태 |
|---|---|---|
| `Project`, `User` | `TeamProject`, `User`(기존) | 이식 완료(jej_20, ReqFlow 쪽 폐기) |
| `Requirement`, `RequirementVersion`, `Baseline` | `requirements` 모듈 엔티티 | 엔티티 완료, 버전/베이스라인 API 미완 |
| `AnalysisFinding` | 동일 | 완료 |
| `ValidationDetail`, `TraceabilityRecord` | 동일 | 엔티티만 존재, 계산 로직 없음 |
| `BuildHistory`, `RequirementBuildSnapshot` | 없음 | CodeVi는 실제 Jenkins 빌드 이력이 별도 존재 — 신규 매핑 필요 |
| `Document`, `GeneratedDocument` | 없음 | 신규 |
| `WebhookEvent` | 없음(CodeVi는 이미 자체 webhook 처리 있음) | 이식 불필요 |
| `AppState` | 불필요(JWT 세션으로 대체됨) | 이식 안 함 |

---

## 1. 목표

**왜 필요한가**: jej_20/21로 "요구사항 등록·조회·텍스트 기반 AI 분석"까지는 끝났지만, ReqFlow가 원래
제공하던 나머지 가치 — ① 요구사항이 실제 코드로 얼마나 구현됐는지 자동 검증, ② 요구사항 문서(SRS/PRD)
자동 생성, ③ 요구사항 변경 이력·의존관계 관리 — 는 아직 CodeVi에 없다. 이 문서는 이 나머지를 **CodeVi에
이미 있는 실제 데이터(AST, 실제 Jenkins/GitHub 연동)를 우선 활용하는 방향으로** 재설계해, ReqFlow를
그대로 복사하지 않고 어떤 부분을 가져오고 어떤 부분을 버릴지 결정한다.

**범위**: ReqFlow 7개 화면 중 Requirements CRUD/입력, Analysis 계산 로직은 이미 이식 완료(§0.1) —
재작업하지 않는다. **Dashboard는 절반만 이식됐다**(§0.2 Dashboard 정정 참고 — KPI 일부·AI 인사이트·마감
위젯만 있고 라이프사이클 진척바·상태분포·커버리지 리스트·빌드 타임라인은 아직 없음). 남은 것은 아래
Phase로 나눈다. 각 Phase는 독립적으로 승인/구현 가능하며, 반드시 순서대로 할 필요는 없다(단, Phase 8/12는
Phase 7의 `ValidationDetail`/`implementationScore`를, Phase 12는 Phase 10의 빌드 데이터도 함께 쓰므로
Phase 7·10 이후 권장).

### 1.1 Phase 번호 연속성

jej_20이 이미 "Phase 7: 요구사항-코드 자동 매핑 엔진"과 "Phase 8: Documents/BuildHistory/Settings(후순위,
별도 spec)"을 예약해뒀다. 이 문서가 그 "별도 spec"이며, 번호를 이어받아 Phase 7부터 시작한다.

### 1.2 화면 통합 방식 — 탭 아키텍처 (확정)

Requirements 상세/Documents/Build History/Settings/Analysis 전체보기를 각각 어떻게 배치할지 Phase별로
따로 판단해왔는데(§0.2, §3), 결론이 전부 "별도 라우트 불필요"로 수렴했으므로 여기서 하나로 확정한다.

- **`/projects/:teamProjectId` 단일 라우트를 유지**하고, `ProjectDetail.tsx` 내부에 클라이언트 사이드
  탭 상태(`useState`)로 개요/요구사항/문서/빌드 이력/설정 섹션을 전환한다. URL은 바뀌지 않는다.
- **근거**: `code-vi-front/src/App.tsx`(81~156행)를 확인한 결과 현재 라우팅이 전부 flat `<Route>`
  구조이며 `<Outlet>` 기반 nested route 패턴이 이 코드베이스에 없다 — `/projects/:id/build-history`
  같은 중첩 라우트를 새로 도입하기보다 기존 관행(탭 상태 전환)을 따르는 쪽이 일관적이다.
- **Build History가 별도 화면이 아니라는 근거(추가 확인)**: `/code-insight/dashboard`(`Dashboard.tsx`)는
  하드코딩된 더미 데이터라 무관하고, `/dashboard`(`DashboardPage.tsx`, `SnapshotStrip.tsx`)에도
  `buildNumber`/Jenkins 관련 로직이 없다 — 즉 "프로젝트별 Jenkins 빌드 이력"을 보여주는 화면이 CodeVi에
  현재 **존재하지 않는다**. 새로 만드는 데 중복 화면 문제가 없으므로, 탭으로 합쳐도 기존 화면과 부딪히지
  않는다.
- **무거워지는 문제 대응**: 탭을 처음 클릭할 때만 해당 탭의 API를 호출한다(lazy fetch). Phase 7·9·10·12가
  각각 독립된 엔드포인트(`mapping-summary`, `documents/generate`, `build-history`, findings 등)로 설계돼
  있어 처음부터 전부 불러올 필요가 없다.
- 이 결정은 §2 Phase 9(Documents)·10(Build History)·11(Settings)·12(Analysis 확장)에 공통 적용된다 —
  각 Phase 항목에서 "탭으로 통합"이라고만 짧게 표기하고 이유는 반복하지 않는다.

### 1.3 인가 규칙 — 신규 엔드포인트 전체 공통 (확정)

jej_21은 정확히 "새 엔드포인트에 프로젝트 멤버십 검증을 빠뜨림"을 고치려고 만든 spec이었다(jej_21 §0).
이 문서가 Phase 7~12에서 새로 만드는 엔드포인트(`mapping-summary`, `versions`, `impact`, `dependencies`,
`documents/generate`, `build-history`, `score-timeline` 등 10개 이상)에 같은 실수를 반복하지 않도록,
Phase마다 반복해서 적지 않고 여기서 규칙을 한 번에 확정한다 — **각 Phase의 "완료 조건"에는 해당 엔드포인트가
아래 규칙 중 어느 쪽을 쓰는지와 "타 프로젝트/타 사용자 접근 시 403" 테스트가 반드시 포함되어야 한다.**

- **`teamProjectId`가 라우트 파라미터·쿼리·바디에 직접 있는 엔드포인트** (`mapping-summary`,
  `documents/generate`, `build-history`, `score-timeline`, `impact` 등): 기존 `ProjectMemberGuard` +
  `@ProjectMember({ source: ..., field: 'teamProjectId' })` 데코레이터를 그대로 재사용한다
  (`requirements.controller.ts`의 기존 패턴과 동일).
- **`requirement.id`로만 대상이 특정되는 엔드포인트**(`.../:id/versions`, `.../:id/dependencies`,
  `.../:id`의 상태 전이 PATCH 등): 기존 `RequirementOwnerGuard`를 재사용한다(요구사항→프로젝트 순서로
  조회 후 검증하는 기존 패턴, `update`/`remove`와 동일).
- 새 가드나 새 검증 로직을 만들지 않는다 — 전부 기존 두 가드의 재사용으로 충분하다.

### 1.4 데이터 무결성 — 신규 엔티티의 cascade delete (확정)

`team-project.service.ts:290`(`deleteProject`)을 확인한 결과, 프로젝트 삭제(jej_22)가 동작하는 이유는
TypeORM이 알아서 처리해서가 아니라 `Requirement` 엔티티가 `@ManyToOne(() => TeamProject, { onDelete:
'CASCADE' })`를 **명시적으로 선언**했기 때문이다(DB 레벨 FK cascade). 이 문서에서 새로 만드는 엔티티는
이 선언을 빠뜨리면 프로젝트 삭제 시 FK 제약 위반 에러가 나거나 고아 행이 남는다 — 각 Phase에서 아래를
지킨다:

- Phase 8의 요구사항 의존관계 조인 테이블: `Requirement`를 참조하는 FK에 `onDelete: 'CASCADE'` 필수
  (요구사항 삭제 시 의존관계도 같이 삭제되어야 함 — `Requirement` 자체가 이미 `TeamProject`에 cascade로
  걸려있으므로 연쇄적으로 정리됨).
- Phase 9의 `Document`/`GeneratedDocument`: `teamProjectId`를 직접 참조하므로 `onDelete: 'CASCADE'`를
  새로 선언해야 한다 — 기존 `Requirement`처럼 자동으로 따라오지 않는다.
- Phase 7의 `ValidationDetail`/`TraceabilityRecord`는 이미 Phase 2에서 만들어진 엔티티이므로 기존 선언을
  그대로 확인만 한다(신규 작업 아님).

---

## 2. 구현 단계 (Phases)

### Phase 7: 요구사항-코드 자동 매핑 엔진 (jej_20에서 설계, 이 문서에서 구체화)

- 작업:
  - `recomputeForTeamProject(teamProjectId)`: 대상 `teamProjectId`의 최신 `AstSnapshot` →
    `AstFile`+`AstClass`+`AstFunction`을 후보 텍스트로 토큰화 → 각 `Requirement`(제목+설명+수용기준)와
    overlap score 계산(ReqFlow `overlapScore` 알고리즘 재사용, **비교 대상만 목업→실데이터로 교체**) →
    top-5 평균 60% + 수용기준 충족도 40% = `implementationScore` 갱신.
  - `ValidationDetail`(매칭 파일, 누락 로직 추정, 수용기준별 충족 여부)과 `TraceabilityRecord`(요구사항↔
    코드파일 링크)를 위 결과로 채운다.
  - 트리거: (1) AST 저장 성공 직후 자동 실행(`AstRelationalController.saveAstData()`, fire-and-forget),
    (2) `/projects/:id`의 "재검증" 버튼으로 수동 실행.
  - `GET /api/requirements/:teamProjectId/mapping-summary` → `{ total, mapped, requirements: [...] }`
    (§1.3 규칙 — `ProjectMemberGuard` 적용).
  - 프론트: `/projects/:id`에 매핑 요약 배너("N개 중 M개 매핑됨") + 요구사항별 점수 배지. 원본 Validation
    목록 패널의 **상태 필터**(전체/완료/대부분/일부/미구현)와 **추정 점수 필터**(전체/70%+/40-69%/<40%),
    항목별 "유사도 · 매칭 N · 누락 N" 통계 표시는 그래프 없이도 저비용으로 이식 가능하므로 함께 포함한다
    (그래프만 빼고 목록 UI 디테일까지 같이 빠뜨리지 않도록 명시).
- **원본 대비 축소/변경**(§4 근거):
  - `RelationshipGraph`(SVG 관계 그래프)와 `CodeAssociationSection`의 그래프/트리/매트릭스 4탭 UI는
    1차 이식에서 제외한다. 요구사항별 매칭 파일을 리스트로만 보여준다 — 그래프 시각화는 실사용 데이터로
    검증된 뒤 후속 Phase에서 추가 검토.
  - 코드 스니펫 패널(`CodeSnippetPanel`)은 실제 파일 내용을 읽어야 의미가 있는데, CodeVi가 원본 소스
    파일 자체를 저장하지 않고 AST 구조만 저장한다면(확인 필요) 스니펫 표시가 불가능할 수 있다 — 이 Phase
    착수 전 `AstFile`에 원본 코드/라인 정보가 있는지 먼저 확인해야 한다.
- **정확도/성능 리스크(신규 확인)**: 원본 알고리즘의 비교 대상은 목업 파일 몇 개뿐이었다. 실제
  `AstFile`/`AstClass`/`AstFunction`은 프로젝트 규모에 따라 수백~수천 건일 수 있어, (1) `get`/`id`/
  `config`처럼 흔한 식별자 때문에 토큰 오버랩 오탐이 늘어날 수 있고, (2) 요구사항 수 × 함수 수 연산이라
  프로젝트가 크면 느려질 수 있다. 착수 전 대상 코드베이스 규모를 가늠해보고, 필요하면 파일명/클래스명
  수준으로만 1차 비교한 뒤 상위 후보에 대해서만 함수명까지 비교하는 식으로 범위를 좁히는 방안을 검토한다
  (구체적 최적화 설계는 착수 시점에 실제 데이터 규모를 보고 결정 — 지금 단정하지 않음).
- 완료 조건:
  - `cd code-vi-internal/code-vi-back && npm test -- requirements` 통과(매핑 스코어 계산 단위 테스트)
  - `POST /api/requirements/:teamProjectId/recompute` 후 `implementationScore`가 0이 아닌 값으로 갱신됨
  - 다른 프로젝트 멤버가 `mapping-summary`/`recompute` 호출 시 403 (§1.3)
  - [수동 확인, jej_20과 동일 제약] 실제 Jenkins/GitHub 파이프라인이 있는 환경 필요

### Phase 8: Requirements 상세 기능 확장 (버전/의존관계/영향분석)

- 작업:
  - `GET /api/requirements/:id/versions`: PATCH 시 서버가 자동으로 `RequirementVersion` 스냅샷 생성(변경
    전/후 diff 저장) — ReqFlow와 동일한 자동 이력 방식(§1.3 규칙 — `RequirementOwnerGuard` 적용).
  - `GET /api/requirements/:id/impact`: 연관 문서/코드/빌드/테스트를 모아 보여주는 변경 영향 분석 — Phase 7의
    `TraceabilityRecord`가 있어야 의미가 생기므로 Phase 7 이후 권장(§1.3 규칙 — `RequirementOwnerGuard` 적용).
  - 의존관계(`depends_on`/`related`/`conflicts_with`/`duplicates`): **그래프가 아니라 단순 텍스트
    리스트 + 추가/삭제 폼으로 축소**(§4 근거) — `Requirement`에 자기참조 M2M 또는 별도 조인 테이블 신설.
    이 테이블의 `Requirement` 참조 FK는 `onDelete: 'CASCADE'`로 선언한다(§1.4 규칙).
  - `PATCH /api/requirements/:id`에 상태(`status`) 전이 검증 추가 — 초안→리뷰→승인/반려→폐기(원본
    워크플로 그대로), 승인 상태에서만 베이스라인 지정 가능하도록 서버에서 검증(기존 `RequirementOwnerGuard`
    재사용, §1.3).
  - 프론트: `/projects/:id`의 요구사항 상세를 패널/모달로 확장하며, 다음을 **항목별로 명시**한다(이전
    draft에서 "패널로 확장"이라고만 뭉뚱그렸던 부분):
    - 상태 전이 버튼(재검토 요청/승인/반려/폐기) + 상태 직접 선택 드롭다운
    - 베이스라인 지정 드롭다운(승인 상태에서만 활성화)
    - 관련 문서 리스트(Phase 9의 `Document`가 이 요구사항을 참조하면 표시 — Phase 9 이후 값이 채워짐)
    - 버전 비교 diff 뷰, 의존관계 리스트, 영향 분석 섹션
- **원본 대비 제외**: 댓글 스레드(`CommentThread`)는 이 Phase에서 제외한다(§4 근거) — 필요해지면 별도
  spec.
- 완료 조건:
  - `PATCH /api/requirements/:id` 호출 후 `GET .../versions`에 새 버전이 나타남
  - 의존관계 추가 시 순환 참조(A depends_on B depends_on A) 방지 검증 테스트 통과
  - 다른 프로젝트 멤버가 `versions`/`impact`/의존관계 API 호출 시 403 (§1.3)
  - 요구사항 삭제 시 연결된 의존관계 행도 함께 삭제됨 (§1.4)

### Phase 9: Documents (SRS/PRD/BRS 생성)

- 작업:
  - `documentGenerator`(템플릿 채움 로직)를 백엔드 서비스로 이식 — 선택된 `Requirement[]`를 받아 고정
    섹션 구조(SRS 10개 섹션 등)에 채워 넣는 순수 함수.
  - `POST /api/requirements/:teamProjectId/documents/generate`, 섹션 편집(`PATCH`), 섹션 재생성
    (§1.3 규칙 — `ProjectMemberGuard` 적용).
  - `Document`/`GeneratedDocument` 신규 엔티티: `teamProjectId` FK에 `onDelete: 'CASCADE'` 명시(§1.4
    규칙 — `Requirement`처럼 자동으로 따라오지 않으므로 빠뜨리면 프로젝트 삭제 시 FK 에러).
  - 품질 체크(누락 섹션/추적성 포함 여부)는 순수 계산이라 그대로 이식 가능.
  - 프론트: `/projects/:id`의 "문서" 탭으로 통합(§1.2, 별도 `/documents` 라우트 없음).
- **원본 대비 제외/변경**(§4 근거):
  - PDF/DOCX 내보내기는 **1차 범위에서 제외**한다. 원본도 미구현(alert mock)이었고, 실제 구현하려면
    PDF/DOCX 생성 라이브러리 도입이 필요해 스코프가 별도 spec 수준이다. 대신 "Markdown 복사"만 제공한다
    (클립보드 복사, 신규 의존성 불필요).
  - "AI 재생성" 문구는 "템플릿 재생성"으로 정정한다(§4 근거 — 실제로 LLM이 아님, 오해 방지).
- 완료 조건:
  - `POST .../documents/generate { type: 'SRS', requirementIds: [...] }` → 필수 섹션이 채워진 문서 반환
  - 다른 프로젝트 멤버가 `documents/generate` 호출 시 403 (§1.3)
  - 프로젝트 삭제 시 해당 프로젝트의 `Document`/`GeneratedDocument`도 함께 삭제됨 (§1.4)
  - [수동 확인] 문서 미리보기 화면에서 섹션 편집 후 재조회 시 반영됨

### Phase 10: Build History — ReqFlow 시뮬레이션 대신 실제 Jenkins 이력 연동

> **이전 draft에서 빈약했던 부분**: "시뮬레이션은 뺀다"는 것만 적고, 정작 원본 화면(요약 카드 4개·빌드별/
> 일자별 진척 차트·빌드 이력 테이블·빌드 상세 패널·요구사항별 진척 타임라인)을 **실제 데이터로 어떻게
> 채울지**를 안 적어서 사실상 스코프가 통째로 빠져 있었다. 아래로 보강한다 — 시뮬레이션 로직만 빼고 화면
> 구성 자체는 원본과 동등하게 가져간다.

- 작업:
  - **ReqFlow의 "빌드 시뮬레이션"·커밋메시지 정규식 매핑(`REQ-\d{3}` 매칭, 파일명 키워드 매핑)은 이식하지
    않는다**(§4 근거 — 이미 jej_20에서 경고됨, 이 문서에서 확정). 요구사항↔빌드 연결은 이 정규식 추론이
    아니라 **Phase 7이 AST 매핑 시점마다 남기는 `implementationScore` 스냅샷**으로 대체한다(빌드가 아니라
    "재검증 실행"이 진척의 단위가 됨 — CodeVi는 AST 수집이 Jenkins 빌드 완료에 종속되어 있으므로 결과적으로
    빌드 성공 → AST 갱신 → 자동 재검증 → 스냅샷 순서로 여전히 빌드와 연결된다).
  - `GET /api/requirements/:teamProjectId/build-history`: 해당 `teamProjectId`의 실제 Jenkins 빌드 목록
    (기존 빌드 이력 조회 로직 재사용) + 각 빌드 시점에 가장 가까운 스코어 스냅샷을 조인해 반환 — 원본의
    "빌드 테이블"(상태/브랜치/진척률/증감/생성일)에 대응(§1.3 규칙 — `ProjectMemberGuard` 적용).
  - `GET /api/requirements/:teamProjectId/build-history/:buildNumber`: 빌드 상세(커밋 메시지, 테스트
    결과 — CodeVi Jenkins 파이프라인에 테스트 리포트가 있다면 재사용, 없으면 이 필드는 생략) + 해당 시점
    변경된 요구사항 목록(§1.3 규칙 — `ProjectMemberGuard` 적용).
  - `GET /api/requirements/:teamProjectId/score-timeline?requirementId=`: 재검증(Phase 7) 실행마다 남긴
    스코어 스냅샷을 시간순으로 반환 — 요구사항 필터를 걸면 원본의 "요구사항별 진척 타임라인"과 동일
    (§1.3 규칙 — `ProjectMemberGuard` 적용).
  - 프론트: `/projects/:id`의 "빌드 이력" 탭으로 통합(§1.2, 별도 `/build-history` 라우트 없음). 요약 카드
    4개(최근 빌드/성공률/평균 진척/누적 빌드), 빌드별·일자별 진척 차트 2개, 빌드 이력 테이블, 빌드 선택 시
    상세 패널, 날짜/빌드/요구사항 필터 — 원본 레이아웃 그대로 이식하되 데이터 출처만 전부 실제 Jenkins/AST
    파이프라인으로 교체.
- 완료 조건:
  - `GET .../build-history`가 실제 Jenkins 빌드 개수만큼 항목을 반환하고 각 항목에 스코어 스냅샷이 연결됨
  - 재검증을 2회 이상 실행한 프로젝트에서 스코어 변화가 타임라인에 순서대로 나타남
  - 다른 프로젝트 멤버가 `build-history`/`score-timeline` 호출 시 403 (§1.3)
  - [수동 확인, jej_20과 동일 제약] 실제 Jenkins 파이프라인이 있는 환경 필요

### Phase 11: Settings — 읽기 전용 통합 정보 화면

- 작업:
  - `/projects/:id`의 "설정" 탭으로 통합(§1.2, 별도 `/settings` 라우트 없음) — 프로젝트 메타, 베이스라인
    목록, **실제** GitHub/Jenkins 연동 상태(`github-connect`/Jenkins 서비스의 진짜 상태 조회, 원본처럼
    하드코딩하지 않음).
- 완료 조건: `/projects/:id`에서 연동 상태가 실제 `githubRepoFullName`/`JenkinsJobName` null 여부를
  정확히 반영

### Phase 12: Dashboard 잔여 위젯 + Analysis 인라인 확장

> §0.2/§1에서 정정한 대로, Dashboard는 KPI 일부·AI 인사이트·마감 위젯만 이식되고 나머지가 빠져 있었다.
> 이 Phase가 그 나머지를 채운다. Phase 7(점수)·Phase 10(빌드 이력)이 선행되어야 실데이터가 나온다.

- 작업:
  - **라이프사이클 진척바**(도출→분석→명세화→검증→추적 5단계, 단계별 %): 도출/분석은 요구사항 존재
    여부로 100% 고정, 명세화는 Phase 9 문서 생성 여부, 검증은 Phase 7 매핑 완료 비율, 추적은 Phase 10
    빌드 연동 여부로 계산 — ReqFlow 원본이 이 5단계를 어떻게 %로 환산하는지(`useWorkflow.ts` 추정)
    확인 후 동일 기준 적용.
  - **상태 분포 도넛차트**: `implementationScore` 구간별(구현 완료/대부분 구현/미구현/검토 필요) 개수
    집계 — Phase 7 완료 후에만 의미가 생기므로 그 전까지는 이 위젯을 숨긴다(항상 "전부 미구현"으로 보이는
    걸 방지, jej_20 Phase 6 설계 배경과 동일 원칙).
  - **요구사항 커버리지 리스트**: 요구사항별 `implementationScore` 정렬 리스트(상위 N개) — Phase 7의
    매핑 요약과 데이터가 겹치므로 같은 API(`mapping-summary`)를 재사용.
  - **빌드 타임라인 차트**: Phase 10의 `score-timeline`을 프로젝트 전체 평균으로 집계해 라인 차트로 표시.
  - **최근 활동 피드**: `RequirementVersion`(Phase 8) 생성 시점을 활동 로그로 재사용 — ReqFlow처럼 별도
    `activity` 테이블을 새로 만들지 않는다(버전 이력과 내용이 사실상 같아 중복 테이블 방지).
  - **Analysis 인라인 확장**: AI 인사이트 카드에 "전체 보기" 토글 추가 → findings 테이블(유형/요구사항ID/
    설명/심각도/신뢰도) + 선택 행의 우측 설명 패널이 같은 카드 안에서 펼쳐짐(별도 라우트 없음, §0.2
    Analysis 절 결정 참고). 권장조치는 실제 동작하는 것만 남긴다(예: "요구사항으로 이동").
- 완료 조건:
  - [수동 확인] `/projects/:id`에서 Phase 7·10 완료 후 상태 분포·커버리지 리스트·빌드 타임라인이 실데이터로
    렌더링됨(Phase 7/10 전에는 이 위젯들이 보이지 않음을 함께 확인)
  - findings 테이블에서 행 클릭 시 설명 패널이 갱신됨

---

## 3. 복잡도/불필요 항목 검토 (요청사항 — 실제 구현 난이도·가치 대비 판단)

| 항목 | 원본 위치 | 판단 | 이유 |
|---|---|---|---|
| PDF/DOCX 내보내기 | Documents | **제외 권장** | 원본도 미구현(mock alert). 실구현엔 별도 라이브러리+레이아웃 작업 필요, 스코프가 이 문서 밖 |
| 빌드 시뮬레이션 + REQ-ID 정규식 매핑 | BuildHistory | **제외 권장** | CodeVi에 이미 실제 Jenkins 연동 존재. 가짜 빌드가 실제 빌드와 섞여 혼란 유발, jej_20에서도 동일 지적 |
| RelationshipGraph(SVG 관계 그래프) | Validation | **1차 제외, 후순위 검토** | 시각적 매력은 있지만 구현 난이도 높고, 리스트 뷰로도 같은 정보 전달 가능. 실사용 데이터로 가치 검증 후 추가 |
| CodeAssociationSection 4탭(그래프/트리/매트릭스) | Validation | **축소 권장** | 4가지 뷰를 다 만드는 대신 리스트 1개로 시작, 필요성 확인 후 확장 |
| 댓글 스레드(CommentThread) | Requirements 상세 | **후순위** | 알림 시스템 없이 댓글만 있으면 활용도 낮음. 실사용자 협업 패턴이 확인되면 별도 spec |
| 의존관계 그래프 표현 | Requirements 상세 | **축소 권장(텍스트 리스트로)** | 요구사항 수가 적은 초기 단계에서는 그래프보다 리스트가 더 읽기 쉽고 구현도 단순 |
| "코사인 유사도" 문구 | Validation | **문구 수정 필요** | 실제로는 토큰 오버랩 근사치. 그대로 가져오면 사용자에게 잘못된 기술적 인상을 줌 |
| "AI 재생성"(문서) / "AI 생성"(요구사항) 문구 | Documents, Requirements | **문구 수정 필요** | 둘 다 실제 LLM이 아니라 템플릿/고정 목업. jej_20에서 "AI 추정치" 문구는 이미 신중하게 다뤄졌으나 Documents 쪽은 아직 미검토 |
| Settings의 "Git 연동: connected: true" 하드코딩 | Settings | **반드시 실데이터로 교체** | 그대로 가져오면 거짓 정보 표시. CodeVi는 실제 상태를 알 수 있어 오히려 원본보다 정확하게 만들 수 있음 |
| 코드 스니펫 패널 | Validation | **선행 확인 필요** | `AstFile`이 원본 코드 텍스트를 보관하는지 먼저 확인해야 이식 가능 여부 판단 가능(Phase 7 착수 전 확인 항목) |
| Dashboard를 별도 화면(`/`)으로 재구현 | Dashboard | **불필요** | `/projects/:id`에 이미 동등한 정보가 있음(jej_20 Phase 6). 별도 화면 추가는 같은 데이터의 중복 화면만 늘림 |
| Settings를 별도 화면(`/settings`)으로 재구현 | Settings | **불필요** | 항목이 적고 전부 읽기 전용 — `/projects/:id`에 섹션으로 통합하는 게 더 적은 코드로 같은 가치 제공 |
| 멀티유저 "간이 로그인 스위처"(`users.ts`) | 전역 | **이식 안 함(재확인)** | CodeVi는 이미 JWT 인증이 있음(jej_20에서 이미 결정, 재작업 방지 차원에서 재기재) |
| Analysis를 별도 화면(`/analysis`)으로 재구현 | Analysis | **불필요(확정)** | Dashboard와 같은 이유 — `/projects/:id` 카드를 펼치는 방식으로 findings 테이블+설명패널 재현 가능(Phase 12) |
| findings "권장조치" 버튼(요구사항 병합/정책검토 등) | Analysis | **축소 권장** | 원본도 `alert()`만 뜨는 미구현 버튼. 실제 동작(요구사항으로 이동 등)하는 것만 남기고 나머지는 제외 |
| 빌드 상세의 "테스트 결과"(24/25 passed) | BuildHistory | **선행 확인 필요** | CodeVi Jenkins 파이프라인이 테스트 리포트를 남기는지 확인 후 있으면 포함, 없으면 이 필드만 생략(Phase 10) |
| Build History를 별도 화면(`/build-history`)으로 재구현 | BuildHistory | **불필요(확정)** | `/projects/:id` 탭으로 통합(§1.2) — CodeVi에 프로젝트별 Jenkins 빌드 이력 화면이 아직 없어 중복 위험도 없음 |
| 토큰 오버랩 매칭을 전체 함수 단위로 무제한 비교 | Validation/Phase 7 | **범위 좁혀서 시작 권장** | 실제 코드베이스는 목업보다 훨씬 큼 — 오탐·연산량 우려(Phase 7 "정확도/성능 리스크" 참고). 파일·클래스명 우선 비교 후 상위 후보만 함수명까지 보는 방식 검토 |

---

## 4. 의존성

- 선행 spec: `jej_20`(Phase 1~6 완료, Phase 7/8 자리표시자), `jej_21`(완료)
- 신규 패키지: 없음(§3에서 제외한 PDF/DOCX 생성 라이브러리는 이 문서 범위 밖)
- 영향받는 계약: `RequirementsController`/`RequirementsService`에 다수 엔드포인트 추가(§2 Phase별),
  `ValidationDetail`/`TraceabilityRecord` 최초로 실제 값이 채워짐(Phase 7)
- **미확인 전제(착수 전 반드시 확인)**:
  - `AstFile`이 원본 소스 코드 텍스트/라인 정보를 보관하는지 여부(Phase 7의 코드 스니펫 표시, Phase 7
    본체인 매핑 자체는 파일명/클래스명/함수명만으로도 가능하므로 스니펫 없이도 진행 가능)
  - ReqFlow `src/hooks/useWorkflow.ts`(또는 `src/config/workflow.ts`)가 5단계 라이프사이클(도출→분석→
    명세화→검증→추적)을 실제로 어떤 기준으로 %로 환산하는지 — Phase 12가 "ReqFlow와 동일 기준 적용"을
    전제로 하고 있는데, 이 문서를 작성하며 해당 파일을 직접 읽지 않았다(§0.2 조사 범위에서 누락). Phase 12
    착수 전 반드시 확인하고, 확인 결과에 따라 §2 Phase 12의 계산 기준 문장을 갱신한다.

## 5. 검증 계획

- 각 Phase는 독립적으로 `/verify` 게이트(백엔드 유닛 테스트+타입체크)로 우선 검증한다.
- Phase 7·10·12는 실제 Jenkins/GitHub 파이프라인이 있는 환경이 아니면 끝까지 재현 불가 — jej_20과 동일한
  제약을 그대로 승계한다(`[수동 확인]`으로 남김). Phase 12는 Phase 7·10의 산출물을 그대로 표시만 하므로
  선행 Phase가 이미 검증됐다면 추가 인프라 의존은 없다.
- Phase 8·9·11은 코드/외부 인프라 의존이 없어(순수 CRUD+템플릿 계산) 로직 자체는 유닛 테스트로 끝까지
  검증 가능, 화면 렌더링만 수동 확인으로 남는다.
