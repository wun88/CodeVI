// 코드 상태 해시: 세 서브프로젝트의 미커밋 변경(diff + status + untracked 내용)을 지문화한다.
// verify.mjs(스탬프 발급)와 stop-verify-check.mjs(검문)가 같은 정의를 공유한다.
import { execSync } from "child_process";
import { createHash } from "crypto";

export const CODE_DIRS = [
  "code-vi-external/code-vi-front",
  "code-vi-internal/code-vi-front",
  "code-vi-internal/code-vi-back",
];

export const STAMP_FILE = ".claude/.verify-stamp";
export const FLAG_FILE = ".claude/.agent-edited";

export function codeState(root) {
  const git = (cmd) =>
    execSync(`git ${cmd}`, { cwd: root, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  const dirs = CODE_DIRS.map((d) => `"${d}"`).join(" ");
  const diff = git(`diff HEAD -- ${dirs}`);
  const status = git(`status --porcelain -- ${dirs}`);
  const untracked = git(`ls-files --others --exclude-standard -- ${dirs}`)
    .split("\n")
    .filter(Boolean);
  let blobs = "";
  for (const f of untracked) {
    try {
      blobs += git(`hash-object "${f}"`);
    } catch {
      blobs += `missing:${f}\n`;
    }
  }
  return {
    hash: createHash("sha256").update(diff + status + blobs).digest("hex"),
    dirty: status.trim() !== "",
  };
}
