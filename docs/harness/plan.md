# Harness Engineering 실현 계획 (Visualization Team)

본 문서는 다양한 AI 에이전트(Cursor, Antigravity, Claude Code, Codex) 환경에서 표준화된 동작을 보장하기 위한 하네스 엔지니어링 구축 계획을 정의합니다.

## 1. 개요
"도구에 종속되지 않는 표준 개발 환경"을 구축하여, 어떤 에이전트를 사용하더라도 동일한 품질의 결과물과 추적성을 확보하는 것을 목표로 합니다.

## 2. 핵심 구현 항목

### 2.1 대화 및 작업 이력 자동 요약 (Intent & Result)
- **목표**: 에이전트와 나눈 대화의 맥락이 휘발되지 않도록 기록을 중앙 집중화함.
- **방식**: `Agent.md`에 정의된 규칙에 따라, 매 작업 완료 시 `docs/history/YYYY-MM-DD_TaskName.md` 형태로 요약본 생성.
- **포함 내용**:
    - **Intent**: 작업의 배경, 설계 결정 사유.
    - **Result**: 변경된 코드 요약, 검증 결과.
    - **Retrospective**: 실패 사례 및 해결 방법 (다음 에이전트의 참고 지식).

### 2.2 CI/CD 기반 교차 검증 파이프라인
- **목표**: 에이전트의 자가 평가 편향(Self-evaluation bias)을 제거함.
- **워크플로우**:
    1. 에이전트(Antigravity 등)가 코드 작성 및 커밋.
    2. GitHub Actions 트리거.
    3. **1차 검토 (Claude Code)**: 컨벤션 및 로직 결함 체크.
    4. **2차 검토 (Codex)**: 아키텍처 정합성 및 부작용 분석.
- **통과 기준**: 단위 테스트 100% 통과 + 린트 에러 0개 + 교차 리뷰 승인.

### 2.3 전용 MCP 서버 구축 및 통합
- **Notion MCP**: 기획 문서(SSOT)를 에이전트가 직접 읽고 반영. `notion-mcp-server` 활용.
- **Figma & Stitch MCP**:
    - Figma의 디자인 토큰을 코드로 변환.
    - Stitch의 컴포넌트 라이브러리와 디자인 사양 동기화.
- **Visualization MCP**: AST 분석 및 시각화 메트릭 계산을 위한 팀 전용 도구 제공.

### 2.4 Hook & Policy 시스템
- **Git Hooks**: 커밋 전 `scripts/eval_pipeline.sh` 강제 실행.
- **Context Hook**: 에이전트 세션 시작 시 `docs/policy/`의 내용을 최상단 컨텍스트로 주입(Hooking).

## 3. 도입 로드맵
- **Phase 1 (준비)**: `Agent.md`, `Navigator.md` 기반 문서 구조화 및 `docs/history` 운영 시작.
- **Phase 2 (도구)**: Notion, Figma MCP 연동 및 전용 파서 MCP 개발.
- **Phase 3 (자동화)**: CI/CD 교차 리뷰 파이프라인 및 Git Hook 연동.
- **Phase 4 (고도화)**: 에이전트 간의 작업을 측정(LLMOps)하고 하네스 룰 지속 업데이트.
