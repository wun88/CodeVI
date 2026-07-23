---
id: jaeho_07_front_lint_debt_cleanup
status: draft # draft → approved → in-progress → done
owner: jaeho
created: 2026-07-23
history:
---

# Spec: internal-front lint 기저 부채 청산

## 0. 사실 확인 (현재 상태)

- `code-vi-internal/code-vi-front`에서 `npm run lint` 실행 시 **66 errors** (2026-07-23 측정).
  대부분 `@typescript-eslint/no-explicit-any`.
- `npx tsc -b`와 `npm run build`는 통과 — 타입/빌드는 깨져 있지 않고 lint 규칙 위반만 누적된 상태.
- 이 부채 때문에 `/verify`의 front 게이트에서 `npm run lint`가 제외되어 있다
  (`.claude/commands/verify.md` 주석 참조). PostToolUse 훅이 편집 파일 단위로 lint를
  집행하므로 부채는 더 늘지 않지만, 손대지 않는 파일의 부채는 그대로 남는다.
- `code-vi-external/code-vi-front`는 이 환경에 node_modules 미설치 — lint 부채 규모 미측정.

## 1. 목표

internal-front의 lint 오류 0건을 달성하고, `/verify` front 게이트에 `npm run lint`를
복귀시켜 lint를 상시 집행 게이트로 승격한다.

## 2. 구현 단계 (Phases)

### Phase 1: 부채 분류 및 청산

- 작업: `npm run lint` 출력을 규칙별로 분류 → `any` 사용처에 실제 타입 부여
  (API 응답은 기존 타입 정의 재사용). 규칙 자체가 비현실적인 경우는 개별 파일 우회가 아니라
  eslint.config.js 수정으로 제안하고 근거를 이 문서에 기록한다.
- 완료 조건 (Acceptance Criteria):
  - `cd code-vi-internal/code-vi-front && npm run lint` → 0 errors
  - `npx tsc -b && npm run build` 통과 유지

### Phase 2: 게이트 승격

- 작업: `.claude/scripts/verify.mjs`의 `GATES`에서 front 두 프로젝트 맨 앞에
  `npm run lint`를 추가하고, 부채 예외 주석을 삭제.
- 완료 조건 (Acceptance Criteria):
  - verify.mjs에 부채 예외 주석이 남아 있지 않음
  - `node .claude/scripts/verify.mjs` 실행 시 front에서 lint → tsc → build 순서로 전부 통과

## 3. 의존성

- 선행 spec: 없음
- 필요 패키지: 없음
- 영향 계약: 없음 (타입 표기만 변경, 런타임 동작 불변이 원칙)

## 4. 검증 계획

- [수동 확인] any → 구체 타입 교체 과정에서 런타임 동작이 바뀌지 않았는지
  주요 화면(Project Analysis, Dashboard) 로드 확인
