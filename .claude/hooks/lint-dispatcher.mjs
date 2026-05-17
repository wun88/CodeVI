#!/usr/bin/env node
import { readFileSync } from "fs";
import { execSync } from "child_process";

// stdin에서 hook 이벤트 JSON 읽기
const input = JSON.parse(readFileSync(0, "utf-8"));
const filePath = input.tool_input?.file_path || "";
if (!filePath) process.exit(0);

// Windows 경로 정규화
const normalized = filePath.replace(/\\/g, "/");

// sub-project 매핑
const subProjects = [
  "code-vi-external/code-vi-front",
  "code-vi-internal/code-vi-front",
  "code-vi-internal/code-vi-back",
];

const project = subProjects.find(sp => normalized.includes(`/${sp}/`));
if (!project) {
  // 추적 대상 외 파일 (scratch/, docs/ 등) - 조용히 통과
  process.exit(0);
}

console.error(`[verify] ${project}에서 검증 중: ${normalized.split("/").pop()}`);

// 1. ESLint (변경분만, cache 사용)
try {
  execSync(`npx eslint --fix --cache --quiet .`, {
    cwd: project,
    stdio: "inherit",
    timeout: 15000,
  });
} catch {
  // 오류는 stdio로 이미 출력됨
}

// 2. TypeScript 검사
try {
  execSync(`npx tsc -b --noEmit --pretty false`, {
    cwd: project,
    stdio: "inherit",
    timeout: 20000,
  });
} catch {
  // 오류는 stdio로 이미 출력됨
}

process.exit(0);