# [Record] jej_20_requirements_first_project_flow — Phase 3

---

## 1. 작업 개요
- **일시**: 2026-07-23
- **작업자**: Claude (jej031020 세션)
- **대상**: `code-vi-internal/code-vi-back`(team-project/requirements 모듈),
  `code-vi-internal/code-vi-front`(신규 `MyProjects` 페이지)

## 2. 의도 (Intent)
- **작업 동기**: [jej_20 spec](../../../specs/jej_20_requirements_first_project_flow.md) Phase 3 —
  Phase 1(코드 없는 프로젝트 생성)과 Phase 2(요구사항 CRUD)로 만들어진 두 종류의 데이터를 사용자가
  한 화면("내 프로젝트")에서 볼 수 있어야 한다. 사용자가 처음 제시한 스크린샷의 핵심 약속(코드 프로젝트와
  요구사항 전용 프로젝트가 같은 목록에 섞여 나오는 것)을 실제로 구현하는 단계.
- **디자인 결정**:
  - `TeamProjectResponseDto`에 `requirementsCount`/`statusVariant`/`statusLabel`을 추가해 배지 계산을
    **백엔드**에서 하기로 결정했다(스펙 2장이 "백엔드 또는 프론트, 팀 컨벤션에 맞춰 결정"이라고 열어둔
    부분). 이유: 배지 판정 규칙(코드 분석 여부/요구사항 존재 여부)이 데이터 소유 도메인(TeamProjectService)에
    가까워, 프론트가 규칙을 다시 구현하면 백엔드와 두 곳에서 같은 로직을 유지해야 하는 위험이 생긴다.
  - "품질 점수(N점)" 표시를 위해 Dashboard가 이미 쓰고 있는 AST 기반 정밀 산식
    (`code-vi-front/src/utils/buildSnapshotOverview.ts`, 클래스별 WMC/LCOM/CBO 필요)을 그대로 재사용하지
    **않았다** — 목록 조회 시점에 프로젝트마다 이 무거운 계산을 다시 돌리는 것은 리스트 화면에 과하다고
    판단, `CodeAnalysis`에 이미 있는 SonarQube 요약 지표(bugs/vulnerabilities/security_hotspots/code_smells)
    만으로 계산하는 훨씬 단순한 근사치(`computeListQualityScore`)를 새로 만들었다. **이 점수는 Dashboard의
    정밀 점수와 다른 값일 수 있다** — spec/코드 주석에 이 사실을 명시했다. 두 산식을 통일할지는 별도 판단이
    필요한 열린 질문으로 남긴다.
  - 요구사항 개수 조회(`countByTeamProjectIds`)는 `TeamProjectService`가 `Requirement` 리포지토리를 직접
    주입받는 대신 `RequirementsService`에 메서드를 추가하고 `TeamProjectModule`이 `RequirementsModule`을
    import하는 방식을 택했다 — 두 도메인의 경계를 서비스 계층에서 지키기 위함(팀 컨벤션에 아직 이런
    교차-모듈 조회 사례가 없어 새로 정한 패턴).
  - 프론트는 기존 `teamProjectService.ts`(당시 "DEAD CODE" 주석이 달려 아무 데서도 안 쓰이던 파일)를
    되살려 `getMyProjects()`를 추가했다 — 새 서비스 파일을 또 만들지 않음.
  - `/projects` 페이지의 "새 프로젝트" 카드는 스크린샷의 `/projects/new` 대신 기존 `/code-insight`로
    이동하게 했다 — 같은 화면(모드 선택)을 위해 라우트를 두 개 두지 않기 위함. spec Phase 4 앞에 그 근거를
    기록해뒀다.
- **참고 문서**: [jej_20_requirements_first_project_flow.md](../../../specs/jej_20_requirements_first_project_flow.md),
  `code-vi-internal/code-vi-front/src/pages/CodeInsight/CodeInsight.css`(dark cinematic 카드 스타일 재사용),
  `code-vi-internal/code-vi-front/src/index.css`(`--internal-*` 디자인 토큰)

## 3. 결과 (Result)
- **주요 변경 사항**:
  - **Backend**
    - `code-vi-internal/code-vi-back/src/requirements/requirements.service.ts`:
      `countByTeamProjectIds(teamProjectIds)` 추가.
    - `code-vi-internal/code-vi-back/src/team-project/team-project.module.ts`: `RequirementsModule` import.
    - `code-vi-internal/code-vi-back/src/team-project/team-project.service.ts`: `RequirementsService` 주입,
      `getMyProjects(userId)` 추가(로그인 사용자가 속한 모든 `TeamProject` + 최신 `CodeAnalysis` +
      요구사항 개수).
    - `code-vi-internal/code-vi-back/src/team-project/dto/team-project-response.dto.ts`:
      `requirementsCount`/`statusVariant`/`statusLabel` 필드와 `computeListQualityScore()` 추가.
    - `code-vi-internal/code-vi-back/src/team-project/team-project.controller.ts`: `GET /team-projects/mine`
      (JWT 인증) 추가.
    - 테스트: `team-project.service.spec.ts`에 `getMyProjects` describe 블록 추가,
      `team-project-response.dto.spec.ts`(신규, 배지 3가지 케이스).
  - **Frontend**
    - `code-vi-internal/code-vi-front/src/interface/teamProject.interface.ts`: 백엔드 DTO와 1:1 대응하는
      `TeamProjectSummary` 타입으로 갱신.
    - `code-vi-internal/code-vi-front/src/services/teamProjectService.ts`: "DEAD CODE" 상태였던 파일을
      되살려 `getMyProjects()` 추가(기존 `any` 타입 lint 부채도 함께 수정).
    - `code-vi-internal/code-vi-front/src/pages/MyProjects/MyProjects.tsx`,
      `MyProjects.module.css`(신규): "내 프로젝트" 목록 페이지 — 로딩/에러/카드 그리드 + "새 프로젝트" 카드.
    - `code-vi-internal/code-vi-front/src/App.tsx`: `/projects` 라우트 추가(`PrivateRoute` 래핑, 기존
      컨벤션과 동일).
    - `.claude/launch.json`(신규): `preview_start`로 이 프론트를 띄우기 위한 설정 등록.
- **검증 결과**:
    - [x] Lint 통과 (Backend/Frontend 모두)
    - [x] Unit Test 합계 — Backend 15/15 pass(신규 4건: `getMyProjects` 1건 + DTO 배지 3건)
    - [x] `cd code-vi-back && npm run build` / `npm test` 통과
    - [x] `cd code-vi-front && npx tsc -b` / `npm run build` 통과
    - [x] `/verify` 스탬프 발급 (`code-vi-back`; front는 verify.mjs 게이트가 tsc+build만 요구 — lint는
      jaeho_07 완료 전까지 제외, 별도로 수동 실행해 확인함)
    - [x] [부분 수동 확인] 로컬 dev 서버(`localhost:5174/projects`)에서 페이지 렌더링, Header, 에러 상태
      ("프로젝트 목록을 불러오지 못했습니다") 확인. 네트워크 탭에서 `GET /api/team-projects/mine` 호출이
      정상적으로 나가는 것도 확인(백엔드가 이 세션에 없어 404로 실패하는 것 자체는 예상된 결과).
    - [ ] 실제 데이터(코드 분석 완료 프로젝트 + 요구사항 전용 프로젝트)가 채워진 상태에서 배지 문구/색이
      스크린샷과 일치하는지 — **미확인**(4번 항목 참고, 실제 MySQL + 로그인 세션 필요)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**:
  - 브라우저로 `/projects`를 확인하려 할 때 프론트 개발 서버 포트(5174)가 이미 사용자 자신의 다른
    세션(node.exe, vite.js)에 의해 점유돼 있었다. `preview_start`가 "이 프로세스를 죽여도 되는지" 확인을
    요구했는데, 명령줄을 확인해보니 정확히 이 프론트 프로젝트의 기존 dev 서버였다 — 사용자의 작업 중인
    프로세스일 수 있으므로 **죽이지 않고**, 대신 `preview_start`를 `{url: "http://localhost:5174/projects"}`
    형태로 호출해 기존 서버에 그냥 접속하는 방식으로 우회했다.
  - 백엔드가 이 세션에 없어 API 호출은 실패하지만, 그 덕분에 오히려 "에러 상태 UI"가 의도대로 동작하는지도
    함께 확인할 수 있었다(로딩 → 에러 메시지 전환, 콘솔 에러 없음, 네트워크 요청 경로 정확함).
  - 품질 점수 산식을 두 곳(Dashboard의 정밀 산식 vs 목록의 근사치)에 다르게 두는 것이 사용자에게 혼란을
    줄 수 있다는 점을 인지했다 — 지금은 의도적으로 분리했지만, 실제 서비스에서 두 점수가 크게 다르게
    보이면 통일이 필요할 수 있다.
- **해결 방법**: 위 내용대로 기존 서버 보존, 대체 검증 경로 사용, 산식 분리 사실을 spec에 명시.
- **다음 단계**:
  1. (권장, 이 spec 범위 밖) 실제 MySQL + 로그인 세션이 있는 환경에서 `/projects`에 실제 데이터가 채워진
     화면을 사람이 스크린샷과 대조 확인.
  2. jej_20 Phase 4("새 프로젝트 시작하기" 카드 + 요구사항 입력 화면, `CodeInsight.tsx` 3번째 카드 추가 +
     `NewRequirementPage.tsx` 이식)로 진행.
