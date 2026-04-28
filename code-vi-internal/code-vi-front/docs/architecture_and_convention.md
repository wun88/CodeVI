# Architecture & Convention

> 코드 아키텍처, 폴더 구조, 코딩 컨벤션, 설계 결정을 기록합니다.
> 최종 업데이트: 2026-03-27

---

## 1. 기술 스택

| 분류 | 기술 | 버전 | 선택 이유 |
|---|---|---|---|
| 번들러 | Vite | latest | 빠른 HMR, React 공식 권장 |
| UI 프레임워크 | React | 18.x | SPA 구성 |
| 언어 | TypeScript | 5.x | 타입 안전성, 대규모 코드베이스 유지보수 |
| 그래프 시각화 | React Flow | latest | AST 계층 노드 시각화, Zoomable |
| 레이아웃 | Dagre / ELK.js | TBD | 자동 계층 레이아웃 알고리즘 |
| 라우팅 | React Router | v6 | 표준 React 라우팅 |
| HTTP 클라이언트 | Axios | latest | 인터셉터 기반 JWT 처리 |
| 상태관리 | Zustand | latest | 경량 전역 상태 (Auth, 선택된 스냅샷 등) |
| CSS | Vanilla CSS (CSS Modules) | - | 컴포넌트 스코프 스타일 |

---

## 2. 폴더 구조

```
code-vi-front/
├── AGENT.md                        # AI Agent 진입점
├── docs/                           # 프로젝트 문서
│   ├── development_state.md
│   ├── api_spec.md
│   ├── architecture_and_convention.md
│   └── erd.md
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    │
    ├── pages/                      # 라우팅 단위 페이지
    │   ├── LoginPage/
    │   ├── SignupPage/
    │   ├── DashboardPage/          # 팀 프로젝트 목록
    │   ├── HistoryPage/            # 빌드 히스토리 선택
    │   └── VisualizationPage/      # React Flow AST 시각화 (핵심)
    │
    ├── components/                 # 재사용 UI 컴포넌트
    │   ├── common/                 # Button, Input, Modal 등
    │   ├── layout/                 # Header, Sidebar, Layout
    │   ├── flow/                   # React Flow 노드 컴포넌트
    │   │   ├── DirectoryNode.tsx
    │   │   ├── FileNode.tsx
    │   │   ├── ClassNode.tsx
    │   │   ├── FunctionNode.tsx
    │   │   └── AstFlowCanvas.tsx   # React Flow 캔버스 래퍼
    │   └── metrics/                # 품질 메트릭 표시 컴포넌트
    │
    ├── hooks/                      # 커스텀 훅 (데이터 페칭, 상태 로직)
    │   ├── useAuth.ts
    │   ├── useTeamProjects.ts
    │   ├── useAstSnapshot.ts       # 스냅샷 조회 및 React Flow 변환
    │   └── useMetrics.ts
    │
    ├── services/                   # API 호출 레이어 (Axios)
    │   ├── api.ts                  # Axios 인스턴스 및 인터셉터
    │   ├── authService.ts
    │   ├── teamProjectService.ts
    │   ├── astDataService.ts       # AST 조회 서비스
    │   └── metricsService.ts
    │
    ├── store/                      # Zustand 전역 상태
    │   ├── authStore.ts
    │   └── snapshotStore.ts
    │
    ├── interface/                  # TypeScript 타입/인터페이스 정의
    │   ├── auth.interface.ts
    │   ├── user.interface.ts
    │   ├── teamProject.interface.ts
    │   ├── ast.interface.ts        # AST 노드 타입 (핵심)
    │   ├── metrics.interface.ts
    │   └── flow.interface.ts       # React Flow용 Node/Edge 타입
    │
    ├── utils/                      # 순수 유틸리티 함수
    │   ├── astToFlow.ts            # AST JSON → React Flow Nodes/Edges 변환
    │   ├── layoutEngine.ts         # Dagre/ELK 레이아웃 계산
    │   └── tokenStorage.ts         # JWT 토큰 저장/조회
    │
    └── dummy/                      # 목업 데이터 (API 연동 전 UI 검증용)
        ├── dummySnapshot.ts
        └── dummyMetrics.ts
```

---

## 3. 핵심 데이터 플로우

```
[NestJS API]
     ↓ GET /api/ast-data/relational/{snapshotId}
[astDataService.ts]
     ↓ HTTP 응답
[useAstSnapshot.ts hook]
     ↓ astToFlow() 유틸리티로 변환
[React Flow Nodes & Edges]
     ↓ AstFlowCanvas.tsx에 전달
[VisualizationPage] → 렌더링
```

---

## 4. React Flow 시각화 설계

### 4.1 계층 구조
```
[Directory] ─── [Directory] (중첩 가능)
                    │
                [File]
                  ├── [Class]
                  │     └── [Function]
                  └── [Function] (클래스 없는 경우)
```

### 4.2 노드 타입 정의
| 노드 타입 | 색상 (안) | 표시 정보 |
|---|---|---|
| directory | 파란계열 | 디렉토리명 |
| file | 초록계열 | 파일명, 확장자 |
| class | 주황계열 | 클래스명, startLine-endLine |
| function | 보라계열 | 함수명, startLine-endLine |

### 4.3 레이아웃
- **Dagre** 우선 검토 (React Flow 공식 예제 지원)
- 대규모 트리의 경우 **ELK.js** 전환 고려
- 기본 방향: `LR` (좌→우) 또는 `TB` (위→아래) — 결정 필요

---

## 5. 코딩 컨벤션

### 5.1 파일 네이밍
| 종류 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 | PascalCase | `DirectoryNode.tsx` |
| 훅 | camelCase, `use` prefix | `useAstSnapshot.ts` |
| 서비스 | camelCase, `Service` suffix | `astDataService.ts` |
| 인터페이스 | camelCase, `.interface.ts` | `ast.interface.ts` |
| 유틸 | camelCase | `astToFlow.ts` |

### 5.2 컴포넌트 규칙
- 함수형 컴포넌트 + Arrow Function 사용
- Props 타입은 반드시 `interface`로 `interface/`에 별도 정의
- CSS Modules 사용: `ComponentName.module.css`

### 5.3 서비스 레이어 규칙
- 모든 API 호출은 반드시 `services/` 디렉토리 경유
- 훅에서 직접 Axios 호출 금지
- 에러 처리는 서비스 레이어에서 공통 처리

### 5.4 타입 정의 규칙
- `any` 타입 사용 금지
- API 응답 타입은 `interface/`에 명시적으로 정의
- React Flow 노드/엣지 타입도 `flow.interface.ts`에 확장 정의

---

## 6. 인증 전략

| 항목 | 결정 | 비고 |
|---|---|---|
| 토큰 저장 | TBD | localStorage vs httpOnly Cookie |
| Axios 인터셉터 | 요청 시 자동 헤더 주입 | `api.ts` 에서 처리 |
| 만료 처리 | 401 응답 시 로그인 리디렉트 | |
| Google OAuth | 브라우저 리디렉트 방식 | callback 처리 방식 확인 필요 |

---

## 7. 설계 결정 로그 (ADR)

| 날짜 | 결정 | 이유 |
|---|---|---|
| 2026-03-27 | React Flow 채택 | Zoomable 계층 시각화 요구사항 최적 도구 |
| 2026-03-27 | Vite 채택 | CRA 대비 빠른 빌드 속도 |
| 2026-03-27 | Zustand 채택 (안) | Redux 대비 경량, 보일러플레이트 최소 |
| TBD | 레이아웃 알고리즘 | Dagre vs ELK.js 성능 테스트 후 결정 |
