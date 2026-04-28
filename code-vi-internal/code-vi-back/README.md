# CodeVi Backend 🚀

CodeVi 프로젝트는 코드 가시화(Code Visualization) 및 품질 분석을 위한 강력한 백엔드 플랫폼입니다. 정적 분석을 통해 코드의 구조를 파악하고, AST(Abstract Syntax Tree)를 추출하여 시각화 및 수치화된 품질 지표(Metrics)를 제공합니다.

---

## 🌟 주요 기능 (Key Features)

- **AST 추출 및 분석**: 다양한 프로그래밍 언어(C/C++, Java, Python, Go 등)의 소스 코드를 분석하여 추상 구문 트리(AST)를 생성합니다.
- **코드 품질 지표 측정**: Halstead Complexity, 코드 라인 수(SLOC) 등 다양한 소프트웨어 메트릭을 계산합니다.
- **이원화된 AST 저장 방식**: 
  - **Relational 방식**: AST 데이터를 정규화하여 관계형 데이터베이스(MySQL)에 계층 구조(Directory→File→Class→Function)로 저장합니다.
  - **JSON 방식**: 대규모 AST 데이터를 효율적으로 관리하기 위해 JSON 형태로 통째로 저장합니다.
- **SonarQube 연동**: 정적 코드 분석 도구인 SonarQube와 연동하여 심층적인 품질 분석 결과와 통합합니다.
- **실시간 데이터 시각화 지원**: 프런트엔드(D3.js, Cytoscape 등)에서 가시화할 수 있는 계층형 JSON 데이터를 제공합니다.

---

## 🏗️ 시스템 아키텍처 (System Architecture)

### 1. 전체 파이프라인
개발자가 코드를 GitHub에 푸시하면 Jenkins CI/CD를 통해 빌드, 분석, 리포트 과정이 자동으로 진행됩니다.
- **Analysis**: SonarQube, Parser(AST), PyExamine 등을 통해 다각도로 코드를 분석합니다.
- **Backend**: NestJS 기반으로 분석된 데이터를 관리하며, 두 가지 방식의 AST 서버를 운영합니다.

### 2. 코드 가시화 흐름
`Code → AST → Script/JSON → Visualization Engine (D3.js/Cytoscape)`
역공학(Reverse Engineering) 기반의 분석을 통해 복잡한 코드 구조를 직관적인 그래프 형태로 변환합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MySQL](https://www.mysql.com/) (via [TypeORM](https://typeorm.io/))
- **Authentication**: JWT, Google OAuth 2.0 (Passport.js)
- **API Documentation**: [Swagger](https://swagger.io/)
- **Analysis Tools**: Tree-sitter, SonarQube

---

## 🚀 시작하기 (Getting Started)

### 사전 요구 사항
- Node.js (v18+)
- MySQL
- npm 또는 yarn

### 설치
```bash
$ npm install
```

### 환경 변수 설정
`.env` 파일을 생성하고 필요한 설정(DB 연결 정보, 포트, SSL 경로 등)을 입력합니다.

### 서버 실행 (Mode별)

CodeVi는 서로 다른 전략의 세 가지 서버 실행 모드를 지원합니다.

| 명령어 | 설명 | 기본 포트 |
| :--- | :--- | :--- |
| `npm run start` | 표준 백엔드 서버 실행 | `13000` |
| `npm run start:relational` | 관계형 AST 저장소 서버 실행 | `13001` |
| `npm run start:json` | JSON AST 저장소 서버 실행 | `13002` |
| **`npm run start:both`** | **Relational & JSON 서버 동시 실행** | `13001, 13002` |

---

## 📄 API 문서 (Swagger)

서버 실행 후 아래 주소에서 Swagger UI를 통해 API 명세를 확인할 수 있습니다.

- **Standard**: `http://localhost:13000/api`
- **Relational Mode**: `http://localhost:13001/api-docs`
- **JSON Mode**: `http://localhost:13002/api-docs`

---

## 📂 프로젝트 구조 (Project Structure)

```text
src/
├── ast-relational/   # Relational AST 저장 모듈 (Port 13001)
├── ast-json/         # JSON AST 저장 모듈 (Port 13002)
├── metric/           # 소프트웨어 품질 지표(Halstead, Size 등) 계산 로직
├── code-analysis/    # 정적 분석 및 파싱 로직
├── auth/             # 인증 및 인가 (JWT, Passport)
├── users/            # 사용자 관리
└── common/           # 공통 필터, 인터셉터, 유틸리티
```

---

## 👥 팀 정보

- **CodeVi Project Team**
- Contact: [GitHub issues](https://github.com/rlawogh1005/CodeVi/issues)
