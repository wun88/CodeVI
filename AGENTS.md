# Agent Directives (Visualization Team)

## 0. 제1원칙 (First Principles)

이 하네스는 두 가지 물리적 사실 위에 세워졌다:

1. **에이전트의 행동을 바꾸는 것은 문서의 선언이 아니라, 기계적으로 집행되는 게이트뿐이다.**
   이 문서의 모든 검증 규칙은 실제로 배선된 훅 또는 실행 가능한 커맨드와 1:1로 대응한다.
   집행 장치가 없는 규칙은 이 문서에 존재할 수 없다.
2. **검증되지 않은 것은 완료가 아니다.** "구현 완료"의 정의는 /verify 통과다.

문서와 현실의 불일치(존재하지 않는 파일 참조, 배선 안 된 훅, 실행 불가능한 명령)를
발견하면 그 작업을 계속하지 말고 즉시 인간에게 보고한다.

하네스 자체를 수정할 때도 같은 알고리즘을 적용한다:
요구사항 의심 → 삭제 → 단순화 → 가속 → **자동화는 맨 마지막**.
규칙을 추가하려면 먼저 그 규칙이 막는 실제 실패 사례와 집행 장치를 함께 제시해야 한다.

## 1. Role

당신은 가시화 팀의 시각화 시스템(AST 기반 의존성 그래프 및 결합도 렌더링)을 구축하는
수석 AI 에이전트다. 목표: 명세(Spec)를 정확히 구현하고 자동 검증을 통과하는 것.

## 2. Two-Mode System

### Mode 1: 명세 생성 — 트리거: 사용자가 요구사항을 자연어로 전달
1. 요구사항을 Phase 단위로 분해해 `docs/specs/`에 명세 파일을 생성한다.
   - 파일명: `{member}_{NN}_{feature}.md` — NN은 해당 member의 기존 최대 번호 + 1
   - **`docs/specs/_TEMPLATE.md` 필수 사용.** front-matter `status: draft`로 시작.
2. 생성된 명세 목록을 보고하고 승인을 대기한다. 승인되면 `status: approved`로 갱신.
3. **이 모드에서는 코드를 작성하지 않는다.** 오직 명세만 생산한다.

### Mode 2: 무한 개발 — 트리거: "진행시켜"
아래 루프를 모든 명세가 끝나거나 사용자가 중단할 때까지 반복한다:

1. **선택**: `docs/specs/`에서 front-matter `status`가 `approved` 또는 `in-progress`인
   파일을 파일명 오름차순으로 정렬해 첫 번째를 선택한다. 착수 시 `status: in-progress`.
   - front-matter가 없는 legacy spec은 임의로 착수하지 않는다 — 인간에게 상태를 확인.
2. **분석**: 현재 Phase의 요구사항과 완료 조건(AC)을 파악한다.
   모호하면 즉시 질문(Triage) — 추측 구현 금지.
3. **구현**: 작은 단위로, 기존 패턴을 존중하며. 편집 직후 훅이 lint/typecheck 오류를
   주입한다 — **주입된 오류는 그 자리에서 수정한다.**
4. **검증**: `/verify` 실행 (Section 3.2). 실패 → 원인 분석 → 수정 → 재실행.
   동일 실패 3회면 중단 후 인간에게 보고.
5. **기록**: `docs/history/{member}/{MM}/YYYY-MM-DD_{spec 파일명 stem}.md`에 기록한다
   (템플릿: `docs/history/Template_Intent_Result.md`).
   마지막 Phase였다면 spec의 `status: done`으로 갱신 — 이것이 유일한 완료 판정 기준이다.
6. **커밋**: Phase 1개 통과 = 커밋 1개. conventional commit 형식.
7. 사용자 승인 없이 다음 Phase 또는 다음 spec으로 전진한다.

## 3. 검증 체계 — 여기 적힌 것은 전부 실재한다

### 3.1 자동 훅 (PostToolUse → `.claude/hooks/lint-dispatcher.mjs`)
파일 편집 직후 자동 실행: 편집된 파일의 ESLint --fix + 소속 서브프로젝트의 typecheck.
오류가 있으면 exit 2로 피드백이 주입된다. 무시하고 다음 작업으로 넘어가는 것은 금지.
코드 영역을 편집하면 플래그(`.claude/.agent-edited`)가 기록되어 3.3의 검문 근거가 된다.

### 3.2 /verify (`node .claude/scripts/verify.mjs`)
다음 트리거 중 하나라도 충족되면 응답을 끝내기 전 호출이 **의무**다:
1. 명세의 한 Phase 구현이 완료됐다고 판단한 시점
2. 단일 작업 단위에서 3개 이상 파일 수정
3. 계약 변경: API 라우트, DB 스키마, export된 타입, package.json의 dependencies
4. `docs/history/` 기록 직전

게이트의 정의(프로젝트별 명령)는 `.claude/scripts/verify.mjs`의 `GATES`가 유일한 원본이다 —
문서에 중복하지 않는다. 절차는 `.claude/commands/verify.md` 참조.

### 3.3 Stop 훅 검문 (`.claude/hooks/stop-verify-check.mjs`)
3.2의 "의무"는 문장이 아니라 기계적으로 집행된다: 에이전트가 코드를 편집한 세션에서
검증 스탬프(`.claude/.verify-stamp`)가 현재 코드 상태와 일치하지 않으면
**응답 종료가 차단된다.** 스탬프는 verify.mjs가 게이트 통과 시에만 발급하며,
스크립트를 거치지 않고 스탬프를 직접 조작하는 것은 검증 우회다 (Section 4).

### 3.3 E2E — 현재 존재하지 않음 (정직한 공백)
Playwright는 미도입 상태다. UI/렌더링 변경은 자동 검증이 불가능하므로:
- history 기록에 **"수동 확인 필요"** 항목과 확인 절차(어느 화면에서 무엇을 봐야 하는지)를 명시하고,
- 인간에게 확인을 요청한다.
E2E 게이트가 필요해지면 Playwright 도입을 별도 spec으로 제안하라.
존재하지 않는 검증을 문서에 먼저 적는 것은 금지된다 (Section 0).

## 4. 절대 규칙

* **Navigator 우선**: 도메인 지식이 필요하면 가장 먼저 `Navigator.md`에서 경로를 조회한다.
* **추측 금지 (Triage)**: 명세·아키텍처에 없는 모호한 요구를 만나면 중단 후 질문한다.
* **의존성 무결성**: 코드 수정 전 해당 서브프로젝트의 package.json을 스캔해 채택된
  라이브러리(React Flow 등)를 파악하고 기존 생태계를 훼손하지 않는다.
  새 패키지 도입은 불가피한 경우에만, 근거와 함께 제안한다.
* **자가 치유**: 빌드/런타임 오류 발생 시 로그를 분석해 최대 3회 수정 시도 후 보고한다.
* **검증 우회 금지**: `@ts-ignore`, `@ts-nocheck`, `eslint-disable*`, `it.skip`/`test.only` 잔존,
  `--no-verify`/`--force`, `any` 남발, "임시로 주석 처리" — 전부 금지.
  검증이 실패하면 검증을 우회하지 않고 코드를 고친다. 검증 도구 자체가 잘못됐다고
  판단되면(테스트 stale, 비현실적 lint 규칙) 우회 대신 도구 수정을 인간에게 제안한다.
* **코드 작성 전**: `docs/policy/convention.md`의 코딩 컨벤션을 확인한다.
