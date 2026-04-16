# Project Navigator (Knowledge Map)

본 문서는 가시화 프로젝트의 전체 문서 및 코드 구조를 안내하는 인덱스입니다.
작업에 필요한 도메인 지식을 아래 경로에서 확인하십시오. 전체를 읽지 말고 필요한 섹션의 문서만 열람하십시오.

## 1. System Architecture & Specs (시스템 구조 및 명세)
* **전체 아키텍처:** `docs/architecture/system_design.md` (AST 추출부터 프론트엔드 렌더링까지의 데이터 플로우)
* **AST 파싱 파이프라인:** `docs/architecture/tree_sitter_pipeline.md`
* **시각화 레이아웃 스펙:** `docs/specs/visualization_rules.md` (노드/엣지 렌더링 제약 사항)

## 2. Environment & Tools (환경 및 도구)
* **하네스 실현 계획:** `docs/harness/plan.md` (하네스 엔지니어링 표준화 및 도입 로드맵)
* **MCP 서버 목록 및 사용법:** `docs/harness/mcp_registry.md`
* **평가 및 검증 스크립트:** `docs/harness/evaluation_scripts.md` (코드 품질 측정 및 UI 테스트 방법)

## 3. Policy & Conventions (정책 및 규칙)
* **코딩 컨벤션:** `docs/policy/convention.md`
* **자동화 훅 (Hooks):** `docs/policy/hooks.md`

## 4. Codebase Structure (코드베이스 구조)
* `/src/parser` : Tree-sitter 기반 언어별 AST 추출 로직
* `/src/metrics` : 결합도, 응집도 등 코드 스멜 및 메트릭 계산 모듈
* `/src/frontend` : D3.js/Stitch 기반 그래프 시각화 컴포넌트
* `/scripts` : CI/CD 및 검증용 스크립트

## 5. History (히스토리)
* **이전 실행 계획 및 회고:** `docs/history/` (과거 작업 내역, 의도 및 결과 요약 기록)
