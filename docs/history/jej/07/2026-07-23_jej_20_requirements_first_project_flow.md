# [Record] jej_20_requirements_first_project_flow — Phase 1

---

## 1. 작업 개요
- **일시**: 2026-07-23
- **작업자**: Claude (jej031020 세션)
- **대상**: `code-vi-internal/code-vi-back` — `team-project` 모듈

## 2. 의도 (Intent)
- **작업 동기**: [jej_20 spec](../../../specs/jej_20_requirements_first_project_flow.md) Phase 1 —
  "새 프로젝트 시작하기"(요구사항 우선) 플로우를 위해 `TeamProject`가 Jenkins/GitHub 연동 없이도
  생성 가능해야 한다. 지금까지 `TeamProject`는 Jenkins 빌드 알림(`createJenkinsNotification`) 또는
  GitHub 연동(`GithubConnectService.registerProject`) 경로로만 생성됐고, 두 경로 모두 `JenkinsJobName`을
  필수로 요구했다.
- **디자인 결정**:
  - `TeamProject.JenkinsJobName`/`sonarProjectKey`를 nullable로 변경(신규 라이브러리 도입 없음).
  - 신규 엔드포인트는 `github-connect.controller.ts`의 기존 컨벤션(`@UseGuards(AuthGuard())` +
    `@GetUser() user: User`, `dataSource.transaction` 내부에서 `manager.create`/`manager.save`)을 그대로
    따랐다 — 새 패턴을 도입하지 않음.
  - `POST /api/team-projects` 자체를 확장하지 않고 `/requirements-only` 하위 경로를 신설한 이유: 기존
    Jenkins webhook 계약(`CreateTeamProjectAnalysisDto`, 인증 없음)과 신규 플로우(로그인 필수, 요청 바디가
    다름)가 성격이 달라 같은 엔드포인트에 억지로 합치면 오히려 분기 로직이 늘어남.
- **참고 문서**: [jej_20_requirements_first_project_flow.md](../../../specs/jej_20_requirements_first_project_flow.md)

## 3. 결과 (Result)
- **주요 변경 사항**:
  - `code-vi-internal/code-vi-back/src/team-project/entities/team-project.entity.ts`: `JenkinsJobName`,
    `sonarProjectKey`를 `string | null`(nullable)로 변경.
  - `code-vi-internal/code-vi-back/src/team-project/dto/create-requirements-only-project.dto.ts` (신규):
    `{ teamName: string }` 검증 DTO.
  - `code-vi-internal/code-vi-back/src/team-project/team-project.service.ts`:
    `createRequirementsOnlyProject(userId, teamName)` 추가 — 로그인 사용자 조회 후 트랜잭션 내에서
    `JenkinsJobName`/`sonarProjectKey` 없이 `TeamProject` 생성 + `users`에 연결. 사용자 없으면
    `NotFoundException`. 같은 파일 안에서 편집 훅이 드러낸 기존 lint 부채(암묵적 `any` 사용 3곳,
    미사용 파라미터 2곳)도 함께 정리(동작 변경 없음, 타입 안전성만 개선).
  - `code-vi-internal/code-vi-back/src/team-project/dto/team-project-response.dto.ts`: `jenkinsJobName`
    타입을 `string | null`로 조정, `latestAnalysis` 가상 프로퍼티 접근을 `any` 대신 교차 타입으로 정리.
  - `code-vi-internal/code-vi-back/src/team-project/team-project.controller.ts`:
    `POST /api/team-projects/requirements-only`(JWT 인증 필요) 추가.
  - `code-vi-internal/code-vi-back/src/team-project/team-project.service.spec.ts` (신규): 사용자 없음 →
    `NotFoundException`, 정상 생성 시 `JenkinsJobName`/`sonarProjectKey`가 `null`이고 `users`에 현재
    사용자가 포함되는지 검증. `smell-analysis.service.spec.ts`와 동일하게 `team-project.entity.ts`를
    `jest.mock`으로 대체해 `ast-relational` 엔티티 체인의 기존 jest 모듈 해석 이슈(`src/...` 절대경로가
    `rootDir: src` 아래서 해석 안 됨)를 우회.
- **검증 결과**:
    - [x] Lint 통과 (편집 훅이 드러낸 기존 부채 포함 전부 해결)
    - [x] Unit Test 합계 (11/11 pass — 신규 2건 포함)
    - [x] `npm run build` 통과
    - [x] `/verify` 스탬프 발급 (`code-vi-internal/code-vi-back`)
    - [ ] UI 시각적 정합성 확인 — 해당 없음(Backend-only Phase)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**:
  - `team-project.service.ts`, `team-project-response.dto.ts`를 편집하자 편집 훅이 이 파일들에 있던
    기존 lint 부채(암묵적 `any`, 미사용 파라미터)를 즉시 드러냈다. AGENTS.md 3.1("주입된 오류는 그 자리에서
    수정한다")에 따라 Phase 1 범위 밖이지만 함께 수정했다.
  - `getTeamDataWithAstData(projectId, astId)`의 `astId` 파라미터는 실제로 어디서도 사용되지 않고 호출부도
    전무한 죽은 코드였다 — 제거해도 안전함을 `grep`으로 확인 후 시그니처에서 제거.
  - 신규 테스트를 처음 작성했을 때 `TeamProject` 엔티티를 실제로 import하자 `ast-relational` 쪽 엔티티가
    `from 'src/common/entities/common.entity'`(절대경로 스타일)를 쓰는 지점에서 jest 모듈 해석 실패가
    발생했다. `smell-analysis.service.spec.ts`가 이미 같은 문제를 `jest.mock`으로 우회하고 있어 동일 패턴을
    따랐다(이 jest 설정 자체를 고치는 것은 이번 spec 범위 밖).
- **해결 방법**: 위 내용대로 lint 오류 즉시 수정, 죽은 파라미터 제거, 기존 테스트 mocking 컨벤션 재사용.
- **다음 단계**: jej_20 spec Phase 2(Requirement 도메인 엔티티를 TypeORM으로 이식 — `src/requirements/` 모듈
  신설, `teamProjectId` FK로 연결)로 진행.
