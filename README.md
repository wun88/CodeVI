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

```
CodeVi/
├── code-vi-external/
│   ├── code-vi-back/          # NestJS 백엔드
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
│   └── code-vi-front/         # React 프론트엔드
│       ├── src/
│       │   ├── pages/         # 페이지 컴포넌트
│       │   ├── components/    # 재사용 UI 컴포넌트 (AstFlowCanvas 등)
│       │   ├── hooks/         # 커스텀 훅 (useAstGraphData 등)
│       │   ├── services/      # API 클라이언트
│       │   ├── interface/     # TypeScript 인터페이스
│       │   └── utils/         # AST → Flow 그래프 변환 유틸
│       ├── Dockerfile
│       └── docker-compose.prod.yml
├── code-vi-legacy/            # (deprecated) Angular 기반 구버전 프론트엔드
├── docs/                      # 프로젝트 명세 및 개발 기록
├── Jenkinsfile                # CI/CD 파이프라인 정의
└── docker-compose.yml         # 로컬 개발용 전체 스택 구성
```

---

## 시작하기

### 사전 요구사항

- Node.js v18+
- MySQL 8.0
- npm

### 백엔드 설정

```bash
cd code-vi-external/code-vi-back

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

```bash
cd code-vi-external/code-vi-front

# 의존성 설치
npm install

# 개발 서버 실행 (포트 5173)
npm run dev

# 프로덕션 빌드
npm run build

# 린트 검사
npm run lint
```

### Docker로 실행

전체 스택(백엔드 + 프론트엔드 + MySQL)을 한 번에 실행:

```bash
# 루트 디렉토리에서
docker-compose up -d
```

개별 서비스 프로덕션 배포:

```bash
# 백엔드
cd code-vi-external/code-vi-back
docker-compose -f docker-compose.prod.yml up -d

# 프론트엔드
cd code-vi-external/code-vi-front
docker-compose -f docker-compose.prod.yml up -d  # Nginx, 포트 80
```

### 데모 데이터 시드

```bash
cd code-vi-external/code-vi-back
node seed.js
```

샘플 팀 프로젝트(`demo-viz-pipeline`)와 계층적 AST 스냅샷 데이터를 생성합니다.

---

## 환경 변수

`code-vi-external/code-vi-back/.env` 파일을 생성하고 다음 변수를 설정합니다:

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
DEVELOP_FRONTEND_URL=http://localhost:5173
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
