---
description: 변경된 서브프로젝트의 빌드/테스트 게이트를 실행하고 검증 스탬프를 발급하는 필수 검증 커맨드
---

# /verify — 필수 검증 게이트

이 커맨드 통과가 "구현 완료"의 정의다 (AGENTS.md Section 0).

## 1. 실행

```
node .claude/scripts/verify.mjs
```

이 스크립트가 **게이트 정의의 유일한 원본**이다. 하는 일:

1. `git status`로 변경된 서브프로젝트를 감지한다 (docs/, .claude/ 등 코드 외 변경뿐이면 게이트 생략).
2. 변경된 각 프로젝트에서 게이트를 순서대로 실행한다 (정의는 스크립트의 `GATES` 참조 —
   back: build+test, front: tsc+build. front lint 제외 사유는 스크립트 주석과
   `docs/specs/jaeho_07_front_lint_debt_cleanup.md` 참조).
3. **전부 통과했을 때만** 검증 스탬프(`.claude/.verify-stamp`)를 발급한다.
   스탬프가 없거나 낡으면 Stop 훅이 응답 종료를 차단하므로, 스크립트를 거치지 않고
   스탬프를 직접 쓰는 것은 검증 우회이며 절대 금지다.

## 2. 실패 시

1. 출력을 읽고 원인을 분류한다: (a) 이번 변경의 버그, (b) 계약 불일치, (c) 테스트/규칙 자체가 stale.
2. (a)(b)는 코드를 고친다. (c)는 명백한 경우에만 도구를 고치되, 보고에 그 사실을 명시한다.
3. 수정 후 스크립트를 재실행한다.
4. **동일 게이트 3회 실패 → 중단하고 인간에게 보고.**
5. 우회 수단(@ts-ignore, eslint-disable, skip, --force, 스탬프 직접 쓰기 등) 사용 절대 금지 (AGENTS.md Section 4).

## 3. 통과 시

스크립트가 출력하는 `✅ verify 통과: {프로젝트 목록}` 한 줄을 보고에 포함한다.
