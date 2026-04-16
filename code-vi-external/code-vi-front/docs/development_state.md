# Development State

> 최종 업데이트: 2026-03-27
> 상태 범례: ✅ 완료 | 🚧 진행중 | 📋 예정 | ❌ 블로킹

---

## Phase 0 — 프로젝트 초기화

| 상태 | 항목 | 비고 |
|---|---|---|
| ✅ | 백엔드 NestJS 구성 완료 | Jenkins Pipeline 연동 포함 |
| ✅ | Tree-sitter 파싱 → NestJS HTTP POST | AST 데이터 DB 저장 완료 |
| ✅ | DB 엔티티 설계 완료 | User, TeamProject, AstSnapshot, AstDirectory, AstFile, AstClass, AstFunction, AstQuality |
| ✅ | React 프로젝트 초기화 | Vite + React + TypeScript — http://localhost:5173 실행 확인 |
| ✅ | NestJS API 연동 설정 | BaseURL=http://localhost:13000, Axios 인터셉터 구성 완료 |

---

## Phase 1 — 프로젝트 기반 구성 ✅ 완료

| 상태 | 항목 | 비고 |
|---|---|---|
| ✅ | Vite React TypeScript 프로젝트 생성 | npm run dev → localhost:5173 |
| ✅ | 폴더 구조 생성 | pages/components/hooks/services/utils/interface/dummy |
| ✅ | React Flow(@xyflow/react) 설치 | v12+ |
| ✅ | Axios 서비스 레이어 구성 | src/services/api.ts — JWT 인터셉터 포함 |
| ✅ | 라우팅 설정 | React Router v6 — /login, /dashboard, /visualization/:id |
| ✅ | 디자인 시스템 결정 | Vanilla CSS Modules — Inter/Fira Code 폰트, 다크 테마 |
| ✅ | TypeScript 인터페이스 정의 | ast.interface.ts, flow.interface.ts, auth.interface.ts |

---

## Phase 2 — 인증 기능 🚧 진행중

| 상태 | 항목 | 비고 |
|---|---|---|
| ✅ | 로그인 페이지 UI | LoginPage.tsx — 탭 전환, Google 버튼 포함 |
| ✅ | 회원가입 UI | LoginPage.tsx 내 모드 전환 |
| ✅ | JWT 토큰 관리 | localStorage.setItem('accessToken') |
| ✅ | 인증 상태 기반 라우트 가드 | PrivateRoute in App.tsx |
| ✅ | 로그아웃 UI | DashboardPage 헤더 버튼 |
| 📋 | Google OAuth callback 처리 | 백엔드 redirect 방식 확인 필요 |

---

## Phase 3 — 팀 프로젝트 관리 🚧 진행중

| 상태 | 항목 | 비고 |
|---|---|---|
| ✅ | 빌드 스냅샷 목록 페이지 | DashboardPage.tsx |
| ✅ | 스냅샷 선택 → 시각화 라우팅 | /visualization/:snapshotId |
| 📋 | 팀 프로젝트 생성 UI | POST /api/team-projects |
| 📋 | 팀 프로젝트 히스토리 조회 | GET /api/team-projects/history |

---

## Phase 4 — AST 코드 시각화 (핵심) 🚧 진행중

| 상태 | 항목 | 비고 |
|---|---|---|
| ✅ | React Flow 캔버스 구성 | AstFlowCanvas.tsx — MiniMap, Controls, Background |
| ✅ | 통합 커스텀 노드 (AstNode) | 타입별 색상/아이콘 분리 |
| ✅ | Dagre 자동 레이아웃 | layoutEngine.ts — TB 방향 |
| ✅ | astSnapshotToFlow 변환 유틸 | flat→tree 재구성, 아티팩트 필터링 |
| ✅ | 노드 클릭 → 우측 상세 패널 | VisualizationPage.tsx |
| ✅ | directory-file-class-function 계층 렌더링 | astToFlow.ts |
| ✅ | directory-file-function 계층 렌더링 | fileFunctions 처리 포함 |
| 📋 | 실제 API 연동 E2E 테스트 | 백엔드 연결 후 검증 필요 |

---

## Phase 5 — 코드 품질 메트릭 뷰

| 상태 | 항목 | 비고 |
|---|---|---|
| 📋 | AstQuality 데이터 시각화 | 점수 기반 색상 코딩 |
| 📋 | Cyclomatic / Halstead / Size 메트릭 표시 | POST /api/metrics/analyze/classic 등 |
| 📋 | 코드 스멜 감지 결과 표시 | POST /api/metrics/analyze/smells |
| 📋 | 빌드 간 품질 변화 비교 | 시계열 차트 |

---

## Phase 6 — 코드 분석 연동

| 상태 | 항목 | 비고 |
|---|---|---|
| 📋 | code-analysis 수동 트리거 UI | POST /api/code-analysis |
| 📋 | 분석 결과 조회 | GET /api/code-analysis |

---

## 🐛 알려진 이슈 / 블로킹

| 우선순위 | 이슈 | 상태 |
|---|---|---|
| HIGH | Google OAuth callback 처리 방식 | ❌ 백엔드 redirect URI/방식 확인 필요 |
| MED | E2E API 연동 테스트 | 📋 백엔드 실행 후 검증 |
| LOW | package.json name이 temp_vite_init으로 되어 있음 | 📋 rename 필요 |
