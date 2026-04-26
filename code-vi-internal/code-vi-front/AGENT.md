# AGENT.md — Code Visualization Frontend

> 이 파일은 AI Agent가 프로젝트를 이해하고 지속적으로 작업하기 위한 핵심 진입점입니다.
> 모든 개발 결정, 컨벤션, 진행상황은 아래 링크된 MD 파일들에 Spec-Driven 방식으로 기록됩니다.

---

## 📌 프로젝트 개요

**Code Visualization Frontend** — NestJS 백엔드와 연동하여 GitHub Repository 코드의 AST(Abstract Syntax Tree) 분석 결과를 React Flow 기반으로 시각화하는 프론트엔드 프로젝트.

| 항목 | 내용 |
|---|---|
| 프로젝트명 | code-vi-front |
| 기술 스택 | React, TypeScript, React Flow, Vite |
| 백엔드 연동 | NestJS (REST API) |
| CI/CD | GitHub Repository → Jenkins Pipeline → NestJS |
| 파싱 기술 | Tree-sitter |

---

## 📂 핵심 문서 목록

| 파일 | 설명 |
|---|---|
| [development_state.md](./docs/development_state.md) | 현재 개발 진행상황, 완료/진행/예정 항목 |
| [api_spec.md](./docs/api_spec.md) | NestJS 백엔드 API 명세 |
| [architecture_and_convention.md](./docs/architecture_and_convention.md) | 폴더 구조, 코딩 컨벤션, 설계 결정 |
| [erd.md](./docs/erd.md) | 백엔드 DB 엔티티 관계도 (참조용) |

---

## 🎯 핵심 목표

1. React Flow를 활용하여 `directory → file → class → function` 계층 구조를 Zoomable하게 시각화
2. NestJS API와 연동하여 실시간 AST 스냅샷 데이터 조회
3. 팀 프로젝트 선택 → 빌드 히스토리 선택 → AST 시각화 플로우 구현

---

## 🔥 Agent 작업 규칙

1. 모든 새로운 기능은 `development_state.md`의 TODO 목록에 먼저 등록 후 구현
2. API 변경사항은 즉시 `api_spec.md`에 반영
3. 컨벤션 결정은 `architecture_and_convention.md`에 기록
4. 컴포넌트 생성 시 `interface/` 디렉토리에 타입 먼저 정의
5. 실제 API 연동 전 `dummy/` 데이터로 먼저 UI 검증

---

## ⚠️ 추가 확인 필요 사항 (착수 전)

- [ ] NestJS 백엔드 서버 BaseURL (로컬/개발/운영)
- [ ] 인증 방식: JWT 토큰 저장 위치 (localStorage vs httpOnly cookie)
- [ ] Google OAuth Redirect URI 프론트엔드 처리 방식
- [ ] React Flow 노드 디자인 가이드라인 (다크모드 여부)
- [ ] 팀 프로젝트 선택 UX 플로우 (로그인 후 대시보드 구성)
