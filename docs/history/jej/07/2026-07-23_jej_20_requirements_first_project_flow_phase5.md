# [Record] jej_20_requirements_first_project_flow — Phase 5

---

## 1. 작업 개요
- **일시**: 2026-07-23
- **작업자**: Claude (jej031020 세션)
- **대상**: `code-vi-internal/code-vi-back`(`team-project`, `github-connect`, `auth` 모듈),
  `code-vi-internal/code-vi-front`(신규 `ProjectDetail` 페이지, `GitHubConnect` 확장)

## 2. 의도 (Intent)
- **작업 동기**: [jej_20 spec](../../../specs/jej_20_requirements_first_project_flow.md) Phase 5 —
  Phase 5 착수 전 재확인으로 원래 하나였던 Phase 5를 "코드 연결 배선"(이번)과 "매핑 엔진"(Phase 6)으로
  나눴다. 이번 Phase의 목표는 (1) 지금까지 없던 프로젝트 상세 화면을 만들고 (2) 이미 존재하는 요구사항
  전용 프로젝트에 GitHub 레포를 연결할 수 있게 하는 것.
- **디자인 결정**:
  - `GET /api/team-projects/:id`를 `team-project.controller.ts`의 **가장 마지막**에 등록했다 — 이미
    등록된 정적 경로(`/history`, `/mine`, `/requirements-only`)와 겹치지 않게 하기 위해서다(순서를
    바꾸면 `/mine` 같은 요청이 `:id` 파라미터로 잘못 매칭될 위험이 있음).
  - "기존 프로젝트에 코드 연결"을 위해 `GithubConnectController`에 새 엔드포인트를 만들지 않고, 기존
    `POST /api/github/projects`(`registerProject`)에 선택적 `teamProjectId` 필드만 추가했다 — 신규
    생성/기존 연결이 로직 대부분(레포 확인, Jenkinsfile 주입, Jenkins Job 생성)을 공유하므로 엔드포인트를
    분리하면 오히려 중복이 생긴다.
  - **소유권 검증을 반드시 추가했다**(spec에서 "선택이 아니라 필수"로 명시한 부분): `teamProjectId`가
    있을 때 `project.users`에 요청자가 포함되어 있는지 확인 → 없으면 403. 이 검증이 없으면 로그인한
    아무나 다른 사람의 프로젝트 id를 넣어 자기 레포를 연결할 수 있었다.
  - GitHub OAuth는 풀 페이지 리다이렉트(브라우저가 GitHub로 갔다가 돌아옴)라 React 상태나 URL 쿼리를
    그대로 유지할 수 없다. 기존에도 로그인 JWT를 `state`(서명된 JWT)에 실어 왕복시키는 패턴이 있었으므로,
    같은 `state`에 `teamProjectId`를 추가로 실어 왕복시키는 방식을 그대로 따랐다(새 메커니즘을 만들지
    않음) — `auth.service.ts::signGithubConnectState`/`verifyGithubConnectState` 확장,
    `auth.controller.ts::githubAuthRedirect`의 콜백 리다이렉트에 `&teamProjectId=` 추가.
  - 프론트에서는 `GitHubConnect.tsx`를 위한 새 라우트를 만들지 않고 기존 컴포넌트에 `teamProjectId`
    분기를 추가했다 — 화면 자체(레포 목록/선택 UI)는 신규 생성이든 기존 연결이든 동일하고, 달라지는 건
    "등록 API에 teamProjectId를 함께 보내는지"와 "성공 후 어디로 이동하는지"뿐이라 컴포넌트를 복제할
    이유가 없었다.
  - `ValidationDetail`/`TraceabilityRecord`를 채우는 실제 매핑 계산(Phase 6 몫)은 이번에 손대지 않았다 —
    코드 연결 직후에는 "연결되긴 했지만 아직 분석 전"이라는 사실을 정직하게 보여주는 안내 문구만 넣었다.
- **참고 문서**: [jej_20_requirements_first_project_flow.md](../../../specs/jej_20_requirements_first_project_flow.md)
  (Phase 5 설계 배경 섹션), `jej_18_github_repository_integration.md`(재사용한 GitHub 연동 원본 스펙)

## 3. 결과 (Result)
- **주요 변경 사항**:
  - **Backend**
    - `code-vi-internal/code-vi-back/src/team-project/team-project.service.ts`:
      `getProjectDetail(userId, teamProjectId)` 추가(멤버십 검증 + `requirementsCount` 포함).
    - `code-vi-internal/code-vi-back/src/team-project/team-project.controller.ts`: `GET /team-projects/:id`
      추가(정적 경로들 뒤에 배치).
    - `code-vi-internal/code-vi-back/src/github-connect/dto/register-project-request.dto.ts`:
      `teamProjectId?: number` 추가.
    - `code-vi-internal/code-vi-back/src/github-connect/github-connect.service.ts`: `registerProject`에
      기존 프로젝트 연결 분기(소유권 검증 → 409 → 갱신) 추가. `buildAuthorizeRedirectUrl`에
      `teamProjectId` 전달 경로 추가. Octokit 에러 타입을 `any`에서 안전한 타입(`asOctokitError`)으로
      정리(편집 훅이 드러낸 기존 부채 포함).
    - `code-vi-internal/code-vi-back/src/github-connect/github-connect.controller.ts`: `connectStart`가
      `teamProjectId` 쿼리를 받아 전달.
    - `code-vi-internal/code-vi-back/src/auth/auth.service.ts`: `signGithubConnectState`/
      `verifyGithubConnectState`에 `teamProjectId` 추가. 같은 파일에서 편집 훅이 드러낸 기존 부채
      (`error: any`, 불필요한 `await`, 미사용 import)도 함께 정리.
    - `code-vi-internal/code-vi-back/src/auth/auth.controller.ts`: GitHub 콜백 리다이렉트에
      `teamProjectId` 쿼리 전달. 같은 파일에서 편집 훅이 드러낸 기존 부채(OAuth 시작 엔드포인트 5개의
      불필요한 `async`, `error: any`)도 함께 정리.
    - `code-vi-internal/code-vi-back/src/github-connect/github-connect.service.spec.ts`(신규):
      `registerProject`의 기존 프로젝트 연결 분기 4개 케이스(403/409/404/정상 갱신) 검증.
    - `code-vi-internal/code-vi-back/package.json`: jest 설정에 `"modulePaths": ["<rootDir>/.."]` 추가 —
      **근본 원인 수정**. `src/...` 절대경로 스타일 import(엔티티 여러 곳에서 사용 중)가 jest에서
      해석되지 않던 문제를 Phase 1/2에서는 파일마다 `jest.mock`으로 우회했는데, 이번에
      `GithubConnectService` 테스트를 작성하며 같은 문제가 또 재발해(이번엔 `AuthService`→
      `UsersService` 경로로) 한 파일씩 우회하는 대신 근본 원인(jest가 tsconfig의 `baseUrl` 상대 경로를
      모른다)을 고쳤다. 이 수정으로 향후 이런 절대경로 import를 가진 파일을 테스트할 때 더 이상
      `jest.mock`으로 우회할 필요가 없어진다(기존 우회 코드들은 그대로 둬도 무해하므로 되돌리지 않음).
  - **Frontend**
    - `code-vi-internal/code-vi-front/src/services/githubConnectService.ts`: `redirectToConnect`/
      `registerProject`에 `teamProjectId?` 파라미터 추가.
    - `code-vi-internal/code-vi-front/src/pages/CodeInsight/GitHubConnect/GitHubConnect.tsx`:
      `teamProjectId` 쿼리를 최초 렌더 시 `useState`로 고정해 OAuth 왕복 후에도 유지, 연결 성공 시
      `teamProjectId`가 있으면 `/projects/:id`로 이동. 같은 파일에서 편집 훅이 드러낸 기존 부채
      (`catch (err: any)` 2곳)도 안전한 헬퍼(`extractErrorMessage`/`getResponseStatus`)로 정리.
    - `code-vi-internal/code-vi-front/src/services/teamProjectService.ts`: `getProjectDetail()` 추가.
    - `code-vi-internal/code-vi-front/src/pages/ProjectDetail/`(신규): 프로젝트명/배지/요구사항 목록,
      코드 미연결 시 "코드 연결" 버튼, 연결됐지만 분석 전이면 안내 문구.
    - `code-vi-internal/code-vi-front/src/pages/MyProjects/MyProjects.tsx`: 카드를 클릭 가능하게 변경
      (`/projects/:id`로 이동).
    - `code-vi-internal/code-vi-front/src/App.tsx`: `/projects/:teamProjectId` 라우트 추가.
- **검증 결과**:
    - [x] Lint 통과 (Backend/Frontend 모두, 편집 훅이 드러낸 기존 부채 포함 전부 해결)
    - [x] Unit Test 합계 — Backend 21/21 pass(신규 4건: `github-connect.service.spec.ts`)
    - [x] `cd code-vi-back && npm run build` / `npm test` 통과
    - [x] `cd code-vi-front && npx tsc -b` / `npm run build` 통과
    - [x] `/verify` 스탬프 발급 (front + back 둘 다)
    - [x] [부분 수동 확인, Browser] 로컬 dev 서버(`localhost:5174`, 기존 서버 그대로 사용)에서
      `/projects/1`, `/code-insight/github?teamProjectId=5` 렌더링 시도 → 정확한 API 경로
      (`GET /api/team-projects/1`, `GET /api/requirements?teamProjectId=1`)로 호출되는 것을 네트워크
      탭으로 확인, 콘솔 에러 없음. 로그인 세션이 없어 두 요청 모두 401을 받고 앱 전역 인터셉터가 `/`로
      리다이렉트하는 것까지만 재현(기존 동작, 이번 변경으로 인한 회귀 아님).
    - [ ] 실제 로그인 세션 + GitHub 레포로 "코드 연결" 버튼 클릭 → OAuth 왕복 → 레포 선택 → 등록 →
      `/projects/:id`로 복귀 → 안내 문구 표시까지 전체 흐름 — **미확인**(로그인 세션/실제 GitHub 앱
      필요, 4번 항목 참고)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**:
  - `github-connect.service.ts`를 편집하자 편집 훅이 이 파일의 기존 `catch (error: any)` 3곳을 모두
    드러냈다 — `no-explicit-any`는 이 프로젝트에서 꺼져 있지만 `no-unsafe-member-access` 등은 켜져 있어
    `any` 타입 값에 대한 멤버 접근이 전부 걸린다. 작은 타입 가드(`asOctokitError`)를 만들어 한 번에
    정리했다.
  - `auth.service.ts`/`auth.controller.ts`는 이 세션에서 처음 편집한 파일인데, 두 파일 다 상당한 기존
    lint 부채(미사용 import, 불필요한 `async`/`await`, `error: any`)를 갖고 있었다. 전부 AGENTS.md 3.1
    ("주입된 오류는 그 자리에서 수정한다")에 따라 이번에 함께 정리했다 — 동작 변경 없이 타입 안전성만
    개선(예: `generateJwt`/`generateAttendanceJwt`/OAuth 시작 엔드포인트 5개에서 불필요한 `async` 제거,
    `Promise.resolve()`로 반환 타입은 유지).
  - `github-connect.service.spec.ts`를 처음 작성할 때 `GithubConnectService`가 생성자에서 실제
    `AuthService` 타입을 받는다는 점 때문에, Nest의 `emitDecoratorMetadata`가 그 타입을 런타임에
    import하게 만들어 `AuthService` → `UsersService` → `TeamProject`(`src/...` 절대경로) 체인이 다시
    깨졌다. Phase 1/2처럼 파일 하나씩 `jest.mock`으로 우회하려다, 이 문제가 벌써 세 번째 재발한 것을
    깨닫고 **근본 원인**(jest가 tsconfig `baseUrl` 스타일의 절대경로 import를 모른다)을 고치기로
    판단했다 — `package.json` jest 설정에 `modulePaths: ["<rootDir>/.."]` 한 줄을 추가하니 별도 우회
    없이 바로 해결됐다. 이 수정은 이번 세션에서 반복적으로 겪은 마찰을 앞으로 완전히 없애는 일반적인
    수정이라고 판단해 적용했다(AGENTS.md "검증 도구 자체가 잘못됐다고 판단되면... 도구 수정을 제안" 원칙에
    부합).
- **해결 방법**: 위 내용대로 타입 가드 도입, 기존 부채 정리, jest 설정 근본 수정.
- **다음 단계**: jej_20 Phase 6(실제 `AstFile`/`AstClass`/`AstFunction` 데이터 기반 요구사항-코드 매핑
  엔진 + "N개 중 M개 매핑됨" 확인 화면)으로 진행. Phase 6은 실제 Jenkins/GitHub 파이프라인이 있는 환경이
  아니면 이 세션에서 끝까지 재현할 수 없다는 점이 spec에 이미 명시되어 있다.
