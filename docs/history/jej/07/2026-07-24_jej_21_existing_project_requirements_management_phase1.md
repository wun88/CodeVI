# [Record] jej_21_existing_project_requirements_management — Phase 1

---

## 1. 작업 개요
- **일시**: 2026-07-24
- **작업자**: Claude (jej031020 세션)
- **대상**: `code-vi-internal/code-vi-back` — `requirements` 모듈

## 2. 의도 (Intent)
- **작업 동기**: [jej_21 spec](../../../specs/jej_21_existing_project_requirements_management.md) Phase 1 —
  jej_20 Phase 6 history에서 "알려진 격차"로 남겨뒀던 문제(요구사항 CRUD에 멤버십 검증이 없음)를 실제로
  고친다. Phase 2(프론트: 기존 프로젝트에 "요구사항 추가" 버튼)를 만들면 이 쓰기 경로가 더 널리 쓰이게 되므로
  더 미루면 안 된다고 판단했다.
- **디자인 결정**:
  - `create`의 시그니처를 바꾸는 대신 파라미터를 추가하는 방식(`create(dto)` → `create(userId, dto)`)을
    택했다 — 호출부가 컨트롤러 한 곳뿐이라 변경 범위가 작았다.
  - `findByTeamProject`는 그대로 두고 `findByTeamProjectForUser`를 새로 추가했다 — 이 메서드가
    `countByTeamProjectIds` 등 이미 다른 내부 로직에서 검증 없이 재사용되고 있어서, 시그니처를 바꾸면
    그 호출부들에도 전부 (불필요한) `userId`를 끌고 다녀야 했다. "외부에 노출되는 API 경로에만 검증을
    추가하고, 내부 재사용 경로는 그대로 둔다"는 원칙으로 접근했다.
- **참고 문서**: [jej_21_existing_project_requirements_management.md](../../../specs/jej_21_existing_project_requirements_management.md),
  jej_20 Phase 5/6에서 이미 쓰인 `assertMembership` 패턴 재사용

## 3. 결과 (Result)
- **주요 변경 사항**:
  - `code-vi-internal/code-vi-back/src/requirements/requirements.service.ts`: `create(userId, dto)`로
    변경(시작 시 `assertMembership` 호출), `findByTeamProjectForUser(userId, teamProjectId)` 신규 추가.
  - `code-vi-internal/code-vi-back/src/requirements/requirements.controller.ts`: `create`/`findAll`이
    `@GetUser() user`를 받아 위 변경된 메서드로 전달하도록 수정.
  - `code-vi-internal/code-vi-back/src/requirements/requirements.service.spec.ts`: 기존 `create` 호출
    전부를 새 시그니처로 갱신, 멤버십 검증 신규 케이스 3건 추가(타인 프로젝트 생성 거부, 타인 프로젝트 조회
    거부, 본인 프로젝트 정상 동작).
- **검증 결과**:
    - [x] Lint 통과
    - [x] Unit Test 합계 28/28 pass(신규 3건)
    - [x] `npm run build` 통과
    - [x] `/verify` 스탬프 발급 예정(이 기록 작성 직후 실행)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: 없음 — jej_20 Phase 5/6에서 이미 검증된 `assertMembership` 패턴을 그대로 재사용해
  마찰 없이 끝났다.
- **다음 단계**: jej_21 Phase 2(프론트 — `/projects/:id`에 "요구사항 추가" 버튼, `NewRequirement.tsx`가
  프로젝트명을 API로 조회하도록 변경, 저장 후 착지점을 `/projects/:id`로 변경)로 진행.
