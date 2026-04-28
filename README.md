# CodeVi — Code Visualization Platform

CodeVi는 소스 코드의 AST(Abstract Syntax Tree)를 추출하고, 이를 인터랙티브한 노드-엣지 그래프로 시각화하는 코드 품질 분석 플랫폼입니다. 개발자가 코드 구조, 의존성, 품질 지표를 시각적으로 파악할 수 있도록 지원합니다.

---

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
  - [사전 요구사항](#사전-요구사항)
  - [백엔드 설정](#백엔드-설정)
  - [프론트엔드 설정](#프론트엔드-설정)
  - [Docker로 실행](#docker로-실행)
- [환경 변수](#환경-변수)
- [API 명세](#api-명세)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [CI/CD](#cicd)
- [Harness Team Engineering](#harness-team-engineering)
  - [개요](#개요)
  - [운영 모드](#운영-모드)
  - [자율 개발 루프](#자율-개발-루프)
  - [디렉토리 구조](#harness-디렉토리-구조)
  - [규칙 및 컨벤션](#규칙-및-컨벤션)

---

## 주요 기능

### 코드 시각화
- C/C++, Java, Python, Go 소스 코드에서 AST 추출 (Tree-sitter 기반)
- Directory → File → Class → Function 계층 구조를 인터랙티브 그래프로 렌더링
- Dagre 레이아웃 엔진을 통한 자동 노드 배치
- 줌, 패닝, 노드 클릭을 통한 상세 정보 확인

### 코드 품질 메트릭
- **클래식 메트릭**: Cyclomatic Complexity, Halstead Metrics, SLOC
- **OO 메트릭**: CBO, RFC, LCOM, WMC, DIT, NOC
- SonarQube 연동을 통한 심화 분석 (버그, 취약점, 코드 스멜)

### 다중 인증
- 이메일/패스워드 로컬 인증
- OAuth 2.0: Google, GitHub, Kakao, Naver

### CI/CD 연동
- Jenkins 웹훅 수신 → 빌드 완료 시 자동 AST 스냅샷 생성
- SonarQube 메트릭 자동 수집 및 저장
- 빌드 히스토리 타임라인 대시보드

### 프로젝트 온보딩
- GitHub 레포지토리 직접 연결
- ZIP 파일 업로드를 통한 로컬 코드 분석

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Backend** | NestJS 11, TypeScript 5.7, TypeORM |
| **Frontend** | React 19, TypeScript, Vite 8 |
| **Database** | MySQL 8.0 |
| **시각화** | React Flow (@xyflow/react v12), Dagre |
| **상태 관리** | Zustand 5 |
| **인증** | JWT, Passport.js, OAuth 2.0 |
| **코드 분석** | Tree-sitter, SonarQube |
| **CI/CD** | Jenkins, Docker, Docker Compose |
| **API 문서** | Swagger/OpenAPI |

---

## 아키텍처

```
GitHub / 로컬 코드
        ↓
Jenkins Pipeline (Webhook)
        ↓
Tree-sitter (AST 추출)  ←→  SonarQube (품질 메트릭)
        ↓
NestJS Backend (MySQL 계층 구조 저장)
        ↓
React Frontend (React Flow + Dagre)
        ↓
인터랙티브 그래프 시각화
```

### 주요 데이터 흐름
1. Jenkins가 빌드 완료 후 `/api/code-analysis` 웹훅 전송
2. 백엔드가 소스 코드를 Tree-sitter로 파싱하여 AST 생성
3. `ast_snapshot` → `ast_directory` → `ast_file` → `ast_class` / `ast_function` 순으로 MySQL에 저장
4. 프론트엔드가 스냅샷을 요청하여 노드-엣지 그래프로 변환 후 렌더링

---

## 프로젝트 구조

CodeVi는 **회사 소개(external)** 와 **CodeVi 플랫폼 본체(internal)** 두 축으로 분리되어 있습니다. 외부 사이트의 LOGIN 버튼은 별도 포트/서브도메인의 internal 플랫폼으로 redirect 됩니다.

```
CodeVi/
├── code-vi-external/
│   └── code-vi-front/         # Re:Factory 회사 소개 페이지 (Vite, :5173)
│       └── src/pages/         # MainPage, AboutUs, FAQ, Community, ContactUs
│
├── code-vi-internal/
│   ├── code-vi-back/          # NestJS 백엔드 (:13000) — external·internal 양쪽이 공유
│   │   ├── src/
│   │   │   ├── auth/          # 인증 (JWT, OAuth 전략)
│   │   │   ├── users/         # 사용자 관리
│   │   │   ├── ast-relational/ # AST 저장/조회 (핵심 모듈)
│   │   │   ├── team-project/  # 팀 프로젝트 관리
│   │   │   ├── code-analysis/ # Jenkins 알림 수신
│   │   │   ├── github-analysis/ # GitHub 온보딩
│   │   │   └── metric/        # 코드 품질 메트릭 계산
│   │   ├── Dockerfile
│   │   └── docker-compose.prod.yml
│   └── code-vi-front/         # CodeVi 플랫폼 프런트엔드 (Vite, :5174)
│       └── src/
│           ├── pages/         # CodeInsight, DashboardPage, VisualizationPage, MyPage, *Callback
│           ├── components/    # AuthPanel, Header, ProjectOnboardingPanel, flow/
│           ├── hooks/         # useAstGraphData, useDashboardData
│           ├── services/      # API 클라이언트
│           ├── interface/     # TypeScript 인터페이스
│           └── utils/         # AST → Flow 그래프 변환 유틸
│
├── code-vi-legacy/            # (deprecated) Angular 기반 구버전 프론트엔드
├── docs/                      # 프로젝트 명세 및 개발 기록
├── Jenkinsfile                # CI/CD 파이프라인 정의
└── docker-compose.yml         # 로컬 개발용 전체 스택 구성
```

### 로그인 흐름

1. 사용자가 `code-vi-external` 사이트의 헤더 `LOGIN` 또는 Hero `코드 진단하기` 버튼 클릭
2. `VITE_INTERNAL_URL` (기본 `http://localhost:5174`) 로 redirect
3. internal 플랫폼은 진입 시 비로그인이면 AuthPanel 모달을 자동 오픈, 인증된 상태이면 `/dashboard` 로 이동

---

## 시작하기

### 사전 요구사항

- Node.js v18+
- MySQL 8.0
- npm

### 백엔드 설정

```bash
cd code-vi-internal/code-vi-back

# 의존성 설치
npm install

# 환경 변수 설정 (아래 환경 변수 섹션 참고)
cp .env.example .env

# 개발 서버 실행 (포트 13000, watch 모드)
npm run start:dev

# 프로덕션 빌드 및 실행
npm run build
npm run start:prod
```

Swagger UI: `http://localhost:13000/api`

### 프론트엔드 설정

CodeVi 플랫폼(internal, 포트 5174):

```bash
cd code-vi-internal/code-vi-front

npm install
npm run dev      # http://localhost:5174
npm run build
npm run lint
```

회사 소개 페이지(external, 포트 5173):

```bash
cd code-vi-external/code-vi-front

npm install
npm run dev      # http://localhost:5173
npm run build
```

> external 의 LOGIN / `코드 진단하기` 버튼은 `VITE_INTERNAL_URL` 로 redirect 됩니다 (기본 `http://localhost:5174`).

### Docker로 실행

전체 스택(백엔드 + 프론트엔드 + MySQL)을 한 번에 실행:

```bash
# 루트 디렉토리에서
docker-compose up -d
```

개별 서비스 프로덕션 배포:

```bash
# 백엔드
cd code-vi-internal/code-vi-back
docker-compose -f docker-compose.prod.yml up -d

# CodeVi 플랫폼 프런트엔드
cd code-vi-internal/code-vi-front
docker-compose -f docker-compose.prod.yml up -d

# 회사 소개 페이지
cd code-vi-external/code-vi-front
docker-compose -f docker-compose.prod.yml up -d
```

### 데모 데이터 시드

```bash
cd code-vi-internal/code-vi-back
node seed.js
```

샘플 팀 프로젝트(`demo-viz-pipeline`)와 계층적 AST 스냅샷 데이터를 생성합니다.

---

## 환경 변수

`code-vi-internal/code-vi-back/.env` 파일을 생성하고 다음 변수를 설정합니다:

```env
# Database
DATABASE_HOST=codevi-db
DATABASE_PORT=13306
DATABASE_NAME=codevi
DATABASE_USERNAME=refactory
USER_DB_PASSWORD=your_db_password
MYSQL_ROOT_PASSWORD=your_root_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=36000000

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=13000

# OAuth - Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OAuth - GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# OAuth - Kakao
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# OAuth - Naver
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# SonarQube
SONAR_TOKEN=your_sonar_token
SONAR_URL=http://sonarqube:9000

# Jenkins
JENKINS_URL=http://jenkins:9002
JENKINS_USER=your_jenkins_user
JENKINS_TOKEN=your_jenkins_token

# CORS - Frontend URLs
DEVELOP_EXTERNAL_FRONTEND_URL=http://localhost:5173
DEVELOP_INTERNAL_FRONTEND_URL=http://localhost:5174
```

---

## API 명세

전체 API 문서는 서버 실행 후 Swagger UI(`/api`)에서 확인할 수 있습니다.

### 인증 (`/api/auth`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/signup` | 회원가입 |
| POST | `/auth/signin` | 이메일/패스워드 로그인 |
| GET | `/auth/google` | Google OAuth 시작 |
| GET | `/auth/google/callback` | Google OAuth 콜백 |
| GET | `/auth/github` | GitHub OAuth 시작 |
| GET | `/auth/github/callback` | GitHub OAuth 콜백 |
| GET | `/auth/kakao` | Kakao OAuth 시작 |
| GET | `/auth/kakao/callback` | Kakao OAuth 콜백 |
| GET | `/auth/naver` | Naver OAuth 시작 |
| GET | `/auth/naver/callback` | Naver OAuth 콜백 |

### AST 데이터 (`/api/ast-data/relational`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/` | AST 스냅샷 저장 (Jenkins에서 호출) |
| GET | `/` | 전체 스냅샷 목록 조회 |
| GET | `/:snapshotId` | 특정 스냅샷 전체 트리 조회 |

### 팀 프로젝트 (`/api/team-projects`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/` | 팀 프로젝트 생성 |
| GET | `/history` | 빌드 히스토리 조회 |

### 메트릭 (`/api/metrics`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/analyze` | 전체 메트릭 분석 (클래식 + OO) |
| POST | `/analyze/classic` | 클래식 메트릭 분석 |
| POST | `/analyze/oo` | OO 메트릭 분석 |
| POST | `/analyze/code-smell` | 코드 스멜 감지 |

### 사용자 (`/api/users`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/:userId` | 사용자 프로필 조회 |
| PATCH | `/:userId` | 사용자 프로필 수정 |

---

## 데이터베이스 스키마

```
ast_snapshot          (빌드 스냅샷 컨테이너)
  └── ast_directory   (디렉토리 노드, 자기 참조)
        └── ast_file  (파일 노드)
              ├── ast_class    (클래스 노드, 자기 참조, startLine/endLine/metrics)
              └── ast_function (함수/메서드 노드, 자기 참조, startLine/endLine)

user             (사용자)
team_project     (팀 프로젝트, Jenkins/SonarQube 연동 정보)
code_analysis    (빌드 알림 및 SonarQube 분석 결과)
```

`ast_class.metrics`는 JSON 컬럼으로 CBO, RFC, LCOM, WMC, DIT, NOC 값을 저장합니다.

---

## CI/CD

`Jenkinsfile`에 정의된 파이프라인은 `deploy` 브랜치에 커밋 시 자동 실행됩니다.

```
1. Checkout
2. 백엔드 + 프론트엔드 병렬 빌드 및 Docker 배포
3. 미사용 Docker 이미지 정리
```

- 백엔드: 포트 `13000`
- 프론트엔드: Nginx 포트 `80`
- MySQL: 포트 `13306` (Docker 내부 `3306`)

---

## Harness Team Engineering

### 개요

Harness는 CodeVi 팀이 여러 AI 에이전트(Claude Code, Cursor, Antigravity, Codex 등)와 협업할 때 **일관된 품질과 추적성**을 보장하기 위한 자율 개발 운영 체계입니다.

**핵심 목표**: 어떤 AI 도구를 사용하더라도 동일한 품질의 결과물을 생산하고, 모든 작업 기록을 구조화된 방식으로 보존합니다.

---

### 운영 모드

Harness는 두 가지 모드로 동작합니다.

#### Mode 1 — 명세 생성 모드

사용자가 자연어로 기능 요구사항을 입력하면:

1. 에이전트가 요구사항을 기술적으로 분해하여 Phase 단위로 구조화
2. `docs/specs/` 디렉토리에 명세 파일 생성
   - 파일명 규칙: `{멤버이름}_{NN}_{feature_name}.md` (예: `jaeho_05_ast_data_integration.md`)
3. 생성된 명세를 사용자에게 보고하고 승인 대기
4. **코드는 작성하지 않음** — 명세 문서만 생성

#### Mode 2 — 무한 개발 모드

사용자가 **"진행시켜"** 라고 입력하면:

1. `docs/specs/`에서 아직 완료되지 않은 명세 중 가장 낮은 번호부터 선택
2. 각 Phase를 사용자 승인 없이 자율적으로 진행
3. 완료된 Phase는 즉시 다음 Phase로 자동 전진
4. 모든 명세가 완료될 때까지 루프 지속

---

### 자율 개발 루프

```
Phase 0: 작업 대상 선택
  └─ docs/specs/ 스캔 → 미완료 명세 중 최소 번호 선택

Phase 1: 명세 분석
  └─ 목표·Phase·인수 조건 파악 → 모호한 부분은 사용자에게 질문 (Triage)

Phase 2: 반복 구현
  └─ 소단위 구현 → 기존 코드베이스 패턴 준수

Phase 3: 자동 검증
  └─ npm run build 실행 → 실패 시 자가 수정 최소 3회 시도
      └─ 3회 후에도 실패 → Triage (사용자에게 보고)

Phase 4: 기록 & 자동 전진
  └─ docs/history/{이름}/{월}/{날짜_feature.md} 기록
  └─ 다음 Phase/명세로 자동 전진
```

**Triage 규칙**: 명세가 모호하거나 빌드가 3회 이상 실패할 경우, 추측하지 않고 반드시 사용자에게 보고합니다.

---

### Harness 디렉토리 구조

```
docs/
├── specs/                          # 명세 파일 (INPUT)
│   ├── jaeho_00_onboarding_specs.md
│   ├── jaeho_03_github_automation.md
│   ├── jaeho_04_jenkins_automation.md
│   ├── jaeho_05_ast_data_integration.md
│   └── jaeho_06_frontend_real_data_wiring.md
│
├── history/                        # 작업 기록 (OUTPUT)
│   ├── Template_Intent_Result.md   # 기록 템플릿
│   └── {멤버이름}/{월}/
│       └── YYYY-MM-DD_feature.md  # Intent / Result / Retrospective
│
├── policy/
│   ├── convention.md               # 코딩 컨벤션
│   └── hooks.md                    # Git 훅 및 자동화 정책
│
├── harness/
│   ├── plan.md                     # 구현 로드맵
│   └── mcp_registry.md             # MCP 서버 연동 가이드
│
└── development_process.md          # 자율 루프 정의
```

| 디렉토리 | 역할 |
|----------|------|
| `docs/specs/` | "두뇌" — 모든 기술·비즈니스 명세 (번호순 우선순위) |
| `docs/history/` | "기억" — 멤버/월별 작업 기록 (Intent/Result/Retrospective) |
| `docs/policy/` | "규칙" — 코딩 컨벤션 및 자동화 정책 |
| `docs/harness/` | "엔진" — 시스템 문서 및 MCP 연동 가이드 |

---

### 규칙 및 컨벤션

#### 핵심 원칙

| 원칙 | 내용 |
|------|------|
| **Triage** | 모호한 명세는 추측하지 않고 사람에게 묻는다 |
| **자가 치유** | 빌드 오류 발생 시 최소 3회 자가 수정 시도 후 보고 |
| **의존성 무결성** | 신규 라이브러리 도입 전 기존 `package.json` 검토 필수 |
| **필수 검증** | 매 구현 후 lint·build 통과 확인 후 다음 단계 진행 |
| **No Hallucination** | 미지 라이브러리 사용 전 공식 문서 확인 필수 |

#### 코딩 컨벤션

- **TypeScript strict** 모드 기본 적용
- **함수형 프로그래밍** 지향: 순수 함수, 사이드 이펙트 최소화
- **시각화 규칙**: 그래프 노드 간격 최대 200px, 레이아웃 알고리즘 최적화
- **자기 문서화**: 모든 함수에 JSDoc 주석 작성
- **보안**: 커밋 전 시크릿 스캔 필수

#### 커밋 메시지 규칙

```
feat:     새로운 기능 (예: AST 파서 추가)
fix:      버그 수정
docs:     문서 업데이트 (AGENTS.md, Navigator.md 등)
refactor: 코드 리팩토링
chore:    빌드/도구 설정 변경
```

#### 히스토리 기록 형식

`docs/history/Template_Intent_Result.md` 형식을 따릅니다:

```markdown
## Intent
- 작업 목적 및 배경
- 주요 설계 결정과 근거
- 참고 문서 링크

## Result
- 변경된 파일 목록 및 요약
- 검증 체크리스트 (Lint ✓ / Build ✓ / UI ✓)

## Retrospective
- 발생한 문제와 해결 방법
- 다음 단계 및 후속 과제
```
