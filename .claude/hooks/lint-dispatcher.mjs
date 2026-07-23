#!/usr/bin/env node
// PostToolUse 훅: 편집된 파일의 ESLint --fix + 소속 서브프로젝트의 typecheck.
// 오류 발견 시 exit 2 → stderr가 에이전트에게 blocking 피드백으로 주입된다.
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { isAbsolute, relative } from "path";

const input = JSON.parse(readFileSync(0, "utf-8"));
const filePath = input.tool_input?.file_path || "";
if (!filePath) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const norm = (isAbsolute(filePath) ? relative(root, filePath) : filePath).replace(/\\/g, "/");

// 서브프로젝트 → typecheck 명령 (전부 incremental이라 2회차부터 수 초 내 완료)
const PROJECTS = {
  "code-vi-external/code-vi-front": "npx --no-install tsc -b",
  "code-vi-internal/code-vi-front": "npx --no-install tsc -b",
  "code-vi-internal/code-vi-back":
    "npx --no-install tsc --noEmit --incremental --tsBuildInfoFile node_modules/.cache/hook.tsbuildinfo",
};

const project = Object.keys(PROJECTS).find((p) => norm.startsWith(p + "/"));
if (!project) process.exit(0); // docs/, .claude/ 등 추적 대상 외 — 조용히 통과

// 에이전트가 코드 영역을 편집했음을 기록 — Stop 훅(stop-verify-check.mjs)의 검문 근거.
// 확장자 무관: package.json, css 등도 코드 상태를 바꾼다.
try {
  writeFileSync(`${root}/.claude/.agent-edited`, norm + "\n", { flag: "a" });
} catch {
  /* 플래그 기록 실패가 lint를 막아선 안 된다 */
}

if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(norm)) process.exit(0);

const fileInProject = norm.slice(project.length + 1);
const cwd = `${root}/${project}`;
if (!existsSync(`${cwd}/${fileInProject}`)) process.exit(0);
if (!existsSync(`${cwd}/node_modules`)) {
  console.error(
    `${project}에 node_modules가 없어 검증할 수 없다. 먼저 해당 디렉터리에서 npm install을 실행하라.`,
  );
  process.exit(2);
}

const failures = [];
const run = (label, cmd, timeout) => {
  try {
    execSync(cmd, { cwd, timeout, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    const out = `${e.stdout || ""}${e.stderr || ""}`.trim() || String(e.message);
    failures.push(`[${label}] ${project}\n${out}`);
  }
};

run("eslint", `npx eslint --fix --cache --quiet "${fileInProject}"`, 30_000);
run("tsc", PROJECTS[project], 120_000);

if (failures.length) {
  console.error(`편집한 파일(${norm})이 검증에 실패했다. 즉시 수정하라:\n\n${failures.join("\n\n").slice(0, 6000)}`);
  process.exit(2);
}
process.exit(0);
