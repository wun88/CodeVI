# ⬡ Code Visualizer (Frontend)

코드 파일의 구조를 AST(Abstract Syntax Tree) 기반으로 계층화하여 시각화해주는 웹 애플리케이션입니다. NestJS 백엔드에서 제공하는 코드 파싱 데이터를 React Flow를 사용하여 직관적인 노드-엣지 그래프로 변환합니다.

## 🚀 주요 기능

- **코드 구조 시각화**: 디렉토리 > 파일 > 클래스 > 메서드/함수의 계층 구조를 직관적으로 탐색.
- **자동 레이아웃**: `Dagre` 엔진을 활용하여 복잡한 코드 구조를 최적의 위치에 자동 배치.
- **빌드 스냅샷 관리**: CI/CD 파이프라인(Jenkins)에서 생성된 빌드 회차별 코드 상태 조회.
- **상세 분석 패널**: 노드 클릭 시 코드 위치(Line Range), 품질 지표 등의 추가 정보 제공.
- **프리미엄 디자인**: 다크 테마 기반의 글래스모피즘 인터페이스와 부드러운 애니메이션 적용.

## 🛠 Tech Stack

- **Core**: React 18, TypeScript, Vite
- **Visualization**: @xyflow/react (React Flow v12), Dagre (Layout Engine)
- **State Management**: Zustand
- **Networking**: Axios
- **Styling**: CSS Modules (Vanilla CSS)

## 📸 Screenshots

| Dashboard | Visualization |
| :---: | :---: |
| ![Dashboard](file:///C:/Users/jaehokim/.gemini/antigravity/brain/4d98a2d9-5956-4385-9eda-75e29a18a0a0/dashboard_snapshots_1774671756431.png) | ![Visualization](file:///C:/Users/jaehokim/.gemini/antigravity/brain/4d98a2d9-5956-4385-9eda-75e29a18a0a0/visualization_snapshot_55_1774671770996.png) |

## ⚙️ 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
현재 디자인 테스트를 위해 8080 포트로 설정되어 있습니다.
```bash
npm run dev
# 또는
npx vite --port 8080
```

### 3. 테스트 계정 (Dummy 모드)
현재 `test_astDataService.ts`를 사용하여 실제 백엔드 없이도 데이터를 확인하실 수 있습니다. `App.tsx`에서 인증 체크가 임시로 비활성화되어 있습니다.

## 📁 프로젝트 구조

```text
src/
├── components/      # 공통 UI 및 Flow 커스텀 노드
│   └── flow/        # AstFlowCanvas, AstNode 등 핵심 시각화 컴포넌트
├── interface/       # API 및 데이터 타입 정의
├── pages/           # 페이지 컴포넌트 (Login, Dashboard, Visualization)
├── services/        # API 통신 (실제 API 및 테스트용 Dummy 서비스)
├── utils/           # AST -> Flow 변환 로직, 레이아웃 엔진
└── dummy/           # UI 테스트용 Mock 데이터
```

## 📄 문서

상세 개발 기획 및 스펙은 `docs/` 디렉토리를 참조하세요.
- [개발 진행 상황](docs/development_state.md)
- [아키텍처 및 컨벤션](docs/architecture_and_convention.md)
- [API 명세서](docs/api_spec.md)

# 향후 계획
- 본 프로젝트를 CodeVi 프로젝트에 통합하고, code-vi-back과 연동하여 실제 서비스화