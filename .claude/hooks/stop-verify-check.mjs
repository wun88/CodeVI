#!/usr/bin/env node
// Stop 훅: 에이전트가 이 세션에서 코드를 편집했는데(.agent-edited 플래그)
// 현재 코드 상태가 검증 스탬프와 다르면 응답 종료를 차단한다(exit 2).
// 스탬프는 오직 .claude/scripts/verify.mjs가 게이트 통과 시에만 발급한다.
import { readFileSync, existsSync, rmSync } from "fs";
import { codeState, STAMP_FILE, FLAG_FILE } from "./code-state.mjs";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  /* stdin 없이 직접 실행된 경우 */
}

// 이미 이 훅이 한 번 차단한 상태 — 무한 루프 방지를 위해 통과시킨다.
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const flag = `${root}/${FLAG_FILE}`;
const stamp = `${root}/${STAMP_FILE}`;

// 에이전트가 이 세션에서 코드 파일을 건드리지 않았다 (사람의 편집은 검문 대상 아님)
if (!existsSync(flag)) process.exit(0);

const { hash, dirty } = codeState(root);

// 미커밋 코드 변경이 없다 (커밋 완료 등) — 플래그 정리 후 통과
if (!dirty) {
  rmSync(flag, { force: true });
  process.exit(0);
}

const stamped = existsSync(stamp) ? readFileSync(stamp, "utf-8").trim() : "";
if (stamped === hash) {
  rmSync(flag, { force: true });
  process.exit(0);
}

console.error(
  "검증되지 않은 코드 변경이 있다. 응답을 끝내기 전에 /verify를 실행하라: " +
    "node .claude/scripts/verify.mjs — 게이트 통과 시 스탬프가 발급되어 종료가 허용된다. " +
    "(방금 실행했는데도 이 메시지가 보인다면 verify 이후 코드를 또 수정한 것이다 — 재실행하라.)",
);
process.exit(2);
