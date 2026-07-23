#!/usr/bin/env node
// /verify 게이트 실행기 — 게이트 정의의 유일한 원본.
// 변경된 서브프로젝트를 감지해 게이트를 실행하고, 전부 통과했을 때만 검증 스탬프를 발급한다.
// 스탬프는 Stop 훅(stop-verify-check.mjs)이 응답 종료를 허용하는 근거다.
import { execSync } from "child_process";
import { writeFileSync, existsSync, rmSync } from "fs";
import { codeState, CODE_DIRS, STAMP_FILE, FLAG_FILE } from "../hooks/code-state.mjs";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// 게이트 정의. lint 미포함 사유: internal-front 기저 부채 66건 —
// docs/specs/jaeho_07_front_lint_debt_cleanup.md 완료 시 front 게이트 맨 앞에 "npm run lint" 추가.
const GATES = {
  "code-vi-internal/code-vi-back": ["npm run build", "npm test"],
  "code-vi-internal/code-vi-front": ["npx --no-install tsc -b", "npm run build"],
  "code-vi-external/code-vi-front": ["npx --no-install tsc -b", "npm run build"],
};

const status = execSync("git status --porcelain", { cwd: root, encoding: "utf-8" });
const changedFiles = status
  .split("\n")
  .filter(Boolean)
  .map((l) => l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop());
const changed = CODE_DIRS.filter((d) => changedFiles.some((f) => f.startsWith(d + "/")));

if (changed.length === 0) {
  console.log("코드 변경 없음 — 게이트 생략");
}

for (const project of changed) {
  if (!existsSync(`${root}/${project}/node_modules`)) {
    console.error(`❌ ${project}: node_modules가 없다. 해당 디렉터리에서 npm install을 먼저 실행하라.`);
    process.exit(1);
  }
  for (const cmd of GATES[project]) {
    console.log(`\n[verify] ${project}: ${cmd}`);
    try {
      execSync(cmd, { cwd: `${root}/${project}`, stdio: "inherit" });
    } catch {
      console.error(`\n❌ 게이트 실패: ${project}: ${cmd}`);
      console.error("스탬프는 발급되지 않았다. 출력을 분석해 코드를 수정한 뒤 재실행하라.");
      process.exit(1);
    }
  }
}

const { hash } = codeState(root);
writeFileSync(`${root}/${STAMP_FILE}`, hash + "\n");
rmSync(`${root}/${FLAG_FILE}`, { force: true });
console.log(`\n✅ verify 통과: ${changed.length ? changed.join(", ") : "(코드 변경 없음)"} — 스탬프 발급됨`);
