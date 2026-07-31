# [Record] jej_20_requirements_first_project_flow — Phase 4

---

## 1. 작업 개요
- **일시**: 2026-07-23
- **작업자**: Claude (jej031020 세션)
- **대상**: `code-vi-internal/code-vi-front` — `CodeInsight`, 신규 `NewProject`/`NewRequirement` 페이지

## 2. 의도 (Intent)
- **작업 동기**: [jej_20 spec](../../../specs/jej_20_requirements_first_project_flow.md) Phase 4 —
  사용자가 처음 제시한 스크린샷의 3번째 카드("새 프로젝트 시작하기")와, 그 뒤에 이어지는 요구사항 입력
  화면을 실제로 만드는 단계. Phase 1(프로젝트 생성 API)·Phase 2(요구사항 CRUD API)를 사용자가 실제로
  쓸 수 있는 화면으로 연결한다.
- **디자인 결정**:
  - ReqFlow(requirements-management-system) `src/pages/NewRequirementPage.tsx`의 3가지 입력 방식(직접
    등록/AI 자연어 생성/CSV 가져오기)을 그대로 유지하되, Tailwind 기반 컴포넌트 라이브러리
    (`PageContainer`/`Card`/`SectionHeader` 등)는 이식하지 않고 CodeVi의 plain CSS + CSS Modules
    컨벤션으로 다시 작성했다 — 두 프로젝트가 서로 다른 스타일링 체계를 쓰기 때문에 컴포넌트째로 옮기면
    오히려 유지보수 부담이 커진다고 판단.
  - ReqFlow의 `owner`(담당자) 선택 드롭다운은 이번 화면에서 뺐다 — ReqFlow는 자체 `User` 목업 목록을
    가정했지만, CodeVi의 실제 로그인 사용자 목록/팀원 UI가 아직 없어 화면에 넣을 실질적인 선택지가 없다
    (백엔드 `Requirement.ownerId`는 nullable이라 비워도 문제 없음). 필요해지면 후속 spec에서
    `TeamProject.users`(팀원)를 드롭다운으로 노출하면 된다.
  - `generateRequirementsFromText`(AI 자연어 생성)와 CSV 파서(`utils/csv.ts`)는 ReqFlow 원본을 최대한
    그대로 이식했다 — 규칙 기반(사실상 고정 데모) 로직이라는 성격 자체를 유지하는 것이 jej_20 spec 1.3의
    "1차 이식에서는 AI 생성 로직도 휴리스틱 그대로 유지" 제안과 일치한다. CSV는 내보내기(export) 기능은
    빼고 가져오기(import)만 이식했다 — 지금 화면에 요구사항 목록/내보내기 화면 자체가 없다.
  - 라우팅: `/code-insight/new`(프로젝트명 입력) → `/code-insight/new/:teamProjectId/requirements`
    (요구사항 입력). 프로젝트 생성 직후 받은 `teamName`은 `navigate`의 `state`로 넘겨 요구사항 입력 화면
    제목에 표시한다(새로고침 시 사라지는 건 감수 — 별도 조회 API를 또 만들 정도는 아니라고 판단).
  - 요구사항 저장 완료 후에는 (ReqFlow처럼 `/requirements` 목록이 아니라) `/projects`("내 프로젝트")로
    이동시켰다 — 지금 존재하는 유일한 의미 있는 착지점이자, 스크린샷이 보여준 흐름(생성 → 목록에서
    "요구사항만 있음" 배지 확인)과 일치한다.
- **참고 문서**: [jej_20_requirements_first_project_flow.md](../../../specs/jej_20_requirements_first_project_flow.md),
  `C:/requirements-management-system/src/pages/NewRequirementPage.tsx`,
  `C:/requirements-management-system/src/mocks/aiGeneration.ts`,
  `C:/requirements-management-system/src/utils/csv.ts`

## 3. 결과 (Result)
- **주요 변경 사항**:
  - `code-vi-internal/code-vi-front/src/pages/CodeInsight/CodeInsight.tsx`,
    `CodeInsight.css`: 3번째 카드("새 프로젝트 시작하기", NEW 배지) 추가.
  - `code-vi-internal/code-vi-front/src/pages/CodeInsight/NewProject/`(신규): 프로젝트 이름 입력 →
    `POST /api/team-projects/requirements-only` 호출 → 성공 시 요구사항 입력 화면으로 이동.
  - `code-vi-internal/code-vi-front/src/pages/CodeInsight/NewRequirement/`(신규): 직접 등록 폼, AI 자연어
    생성(업로드 포함), CSV 가져오기 3개 섹션. 각각 `POST /api/requirements` 호출 후 `/projects`로 이동.
  - `code-vi-internal/code-vi-front/src/utils/aiRequirementDemo.ts`(신규): ReqFlow
    `mocks/aiGeneration.ts` 이식(고정 데모 3건, 1.2초 지연).
  - `code-vi-internal/code-vi-front/src/utils/requirementCsv.ts`(신규): ReqFlow `utils/csv.ts`의
    `parseCsv`/`csvRowsToRequirements` 이식(가져오기 전용, BOM 제거는 `charCodeAt` 검사로 대체 —
    정규식에 유니코드 공백 문자를 직접 쓰면 `no-irregular-whitespace` lint 오류가 남).
  - `code-vi-internal/code-vi-front/src/interface/requirement.interface.ts`,
    `services/requirementsService.ts`(신규): `POST/GET /api/requirements` 클라이언트.
  - `code-vi-internal/code-vi-front/src/services/teamProjectService.ts`:
    `createRequirementsOnlyProject()` 추가.
  - `code-vi-internal/code-vi-front/src/App.tsx`: `/code-insight/new`,
    `/code-insight/new/:teamProjectId/requirements` 라우트 추가.
- **검증 결과**:
    - [x] Lint 통과 (변경 파일 전부 — `npx eslint`로 개별 재확인, front 전체의 기존 lint 부채와는 무관함을
      확인)
    - [x] `npx tsc -b` / `npm run build` 통과
    - [x] `/verify` 스탬프 발급
    - [x] [수동 확인, Browser] 사용자의 기존 로컬 dev 서버(`localhost:5174`, 죽이지 않고 그대로 사용)에서:
      - `/code-insight`에 3번째 카드가 정확한 문구로 렌더링됨
      - `/code-insight/new` 폼 렌더링, 이름 입력 후 제출 시 `POST /api/team-projects/requirements-only`
        호출까지 확인(백엔드 없어 401 → 앱 전역 401 인터셉터가 `/`로 리다이렉트 — 기존 동작, 버그 아님)
      - `/code-insight/new/1/requirements`에서 직접 등록/AI 생성/CSV 3개 섹션 모두 렌더링
      - AI 목업 생성 버튼 클릭 → 1.2초 후 3개 데모 결과 렌더링, 콘솔 에러 없음
    - [ ] 실제 로그인 세션으로 "프로젝트 생성 → 요구사항 등록 → `/projects` 배지 갱신"까지 이어지는 전체
      흐름 — **미확인**(백엔드/로그인 세션 없음, 4번 항목 참고)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**:
  - CSV BOM 제거 정규식(`/^﻿/` 리터럴)을 그대로 옮기려다 `no-irregular-whitespace` lint 오류를
    만났다(정규식 리터럴 안에 실제 U+FEFF 문자가 들어가 있어서). `text.charCodeAt(0) === 0xfeff` 검사로
    바꿔 같은 동작을 유지하면서 lint를 통과시켰다.
  - front 개발 서버 포트(5174)가 사용자의 기존 세션에 이미 떠 있어서, Phase 3에 이어 이번에도 새로
    띄우지 않고 기존 서버에 브라우저로 접속해 확인했다(Monitor로 새 서버를 만들지 않음).
  - 로그인 세션이 없는 상태에서 인증이 필요한 API를 호출하면 기존 axios 인터셉터가 401을 감지해 `/`로
    풀 리다이렉트한다 — 새 화면이 잘못 만들어진 게 아니라 앱 전체가 원래 그렇게 동작한다는 것을 네트워크
    탭으로 확인하고 넘어갔다. 이 때문에 "저장 성공 → `/projects`로 이동" 경로는 실제 로그인 없이는 끝까지
    재현할 수 없었다.
- **해결 방법**: 위 내용대로 대체 검증(클라이언트 로직만 실제 클릭, 서버 필요한 부분은 401 확인으로 대체),
  기존 dev 서버 보존.
- **다음 단계**:
  1. (권장, 이 spec 범위 밖) 실제 로그인 세션 + MySQL 환경에서 전체 플로우(카드 클릭 → 이름 입력 →
     요구사항 등록 → `/projects` 배지 확인)를 사람이 끝까지 확인.
  2. jej_20 Phase 5(코드 연결 & 자동 매핑 확인 화면 — 기존 `github-connect` 모듈을 기존 `teamProjectId`에
     등록하도록 확장 + Validation/Traceability recompute)로 진행.
