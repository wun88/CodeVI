# Project Navigator (Knowledge Map)

본 문서는 프로젝트의 전체 문서 및 코드 구조를 안내하는 인덱스입니다.
전체를 읽지 말고 필요한 섹션의 문서만 열람하십시오.

**여기 적힌 모든 경로는 실존합니다. 죽은 링크를 발견하면 작업을 계속하지 말고 인간에게 보고하십시오.**

---

## 1. Harness (자율 개발 운영 체제)

2-Mode System(명세 생성 / 무한 개발)의 규칙은 [AGENTS.md](AGENTS.md)가 유일한 원본입니다.

| 역할 | 경로 | 설명 |
|------|------|------|
| 📋 지침 | [AGENTS.md](AGENTS.md) | 제1원칙, 2-Mode, 검증 체계, 절대 규칙 |
| 🧠 명세 | [docs/specs/](docs/specs/) | 작업 지시서. 템플릿: [_TEMPLATE.md](docs/specs/_TEMPLATE.md) |
| 📜 기록 | [docs/history/](docs/history/) | `{member}/{MM}/` 구조. 템플릿: [Template_Intent_Result.md](docs/history/Template_Intent_Result.md) |
| ⚙️ 자동 훅 | [.claude/settings.json](.claude/settings.json) | PostToolUse → [lint-dispatcher.mjs](.claude/hooks/lint-dispatcher.mjs) |
| ✅ 검증 커맨드 | [.claude/commands/verify.md](.claude/commands/verify.md) | `/verify` — 서브프로젝트별 빌드/테스트 게이트 |

## 2. Environment & Tools

* **하네스 로드맵:** [docs/harness/plan.md](docs/harness/plan.md)
* **MCP 서버 목록 및 사용법:** [docs/harness/mcp_registry.md](docs/harness/mcp_registry.md)

## 3. Policy & Conventions

* **코딩 컨벤션:** [docs/policy/convention.md](docs/policy/convention.md)

## 4. Codebase Structure

| 경로 | 설명 |
|------|------|
| `code-vi-internal/code-vi-back` | NestJS 백엔드 — AST 분석, 메트릭 API, MCP 서버 |
| `code-vi-internal/code-vi-front` | React + Vite — RE:FACTORY 내부 서비스 (React Flow 시각화). 진입점: [AGENT.md](code-vi-internal/code-vi-front/AGENT.md) |
| `code-vi-external/code-vi-front` | React + Vite — 외부 공개 프론트. 진입점: [AGENT.md](code-vi-external/code-vi-front/AGENT.md) |
| `code-vi-legacy/` | Angular 레거시 (참조용) |
| `jenkins/`, `Jenkinsfile` | CI/CD 파이프라인 |
