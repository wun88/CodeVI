# CodeVi API Specification

이 문서는 CodeVi 백엔드 시스템의 API 명세서입니다. 모든 API는 `/api` 프리픽스를 사용하며, 기본 응답 구조는 공통 DTO 스트럭처를 따릅니다.

## 1. 개요 및 공통 사항

### 1.1 Base URL
- **Local:** `http://localhost:13000/api`
- **Port:** 기본 13000 (환경변수 `SERVER_PORT`로 변경 가능)

### 1.2 공통 응답 구조 (ApiResponseDto)
대부분의 API 응답은 다음 구조를 가집니다:

```json
{
  "success": true,        // 요청 성공 여부
  "statusCode": 200,      // HTTP 상태 코드
  "message": "...",       // 응답 메시지
  "data": { ... },        // 실제 데이터 (선택적)
  "meta": {               // 메타데이터 (페이징 등, 선택적)
    "total": 10
  }
}
```

### 1.3 권한 및 역할 (User Roles)
- `ADMIN`: 시스템 관리자
- `INSTRUCTOR`: 교수/강사
- `STUDENT`: 학생

---

## 2. 인증 관리 (Auth)

기본 경로: `/auth`

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/signup` | 신규 사용자 회원가입 | - |
| `POST` | `/signin` | 로그인 (JWT 발급 - Header/Body 공통) | - |
| `GET` | `/google/signin` | 구글 소셜 로그인 시작 | - |
| `GET` | `/google/callback` | 구글 로그인 콜백 및 리디렉션 | - |
| `GET` | `/attendance/:classId/:sessionId` | 출석용 JWT 토큰 생성 | `INSTRUCTOR`, `ADMIN` |

---

## 3. 사용자 관리 (Users)

기본 경로: `/users`
*모든 요청에 JWT 인증(`Authorization: Bearer <token>`) 필요*

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | 페이지네이션 기반 전체 사용자 목록 조회 | `ADMIN` |
| `GET` | `/:id` | 특정 사용자 정보 조회 | `ADMIN`, `STUDENT` |
| `PUT` | `/:id` | 사용자 정보 수정 | `ADMIN`, `STUDENT` |
| `DELETE` | `/:id` | 사용자 계정 삭제 | `ADMIN`, `STUDENT` |
| `POST` | `/logout` | 로그아웃 (토큰 쿠키 삭제) | - |

---

## 4. 메트릭 분석 (Metrics)

기본 경로: `/metrics`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/analyze` | 최상위 파일 통합 메트릭 분석 |
| `POST` | `/analyze/classic` | Cyclomatic, Halstead, Size 지표 분석 |
| `POST` | `/analyze/ck` | CK Metrics (WMC, DIT, NOC, CBO, RFC, LCOM) 분석 |
| `POST` | `/analyze/oo` | OO Metrics (Neal et al. 1997 기반 10종) 분석 |
| `POST` | `/analyze/smells` | 코드 스멜 감지 및 분석 |
| `POST` | `/complexity` | 순환 복잡도(Cyclomatic Complexity) 단독 계산 |
| `POST` | `/halstead` | Halstead 메트릭 단독 계산 |
| `POST` | `/size` | 코드 크기 지표 (LOC, SLOC, CLOC 등) 계산 |

---

## 5. 관계형 AST 데이터 관리 (AST Relational)

기본 경로: `/ast-data/relational`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/` | 정규화된 AST 데이터 저장 (Dir→File→Class→Func) |
| `GET` | `/` | 전체 AST 스냅샷 목록 조회 |
| `GET` | `/:snapshotId` | 특정 ID의 AST 스냅샷 상세 조회 |
| `GET` | `/benchmark/natural-join/:snapshotId` | Natural JOIN 방식 조회 성능 측정 |
| `GET` | `/benchmark/nested/:snapshotId` | Nested SQL 방식 조회 성능 측정 |
| `GET` | `/benchmark/whole-json/:snapshotId` | Whole JSON 방식 조회 성능 측정 |

---

## 6. 코드 분석 결과 (Code Analysis)

기본 경로: `/code-analysis`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/` | Jenkins 빌드 완료 통보 및 데이터 수집 |
| `GET` | `/` | 대시보드 표시용 분석 데이터 조회 |

---

## 7. 팀 프로젝트 분석 (Team Project)

기본 경로: `/team-projects`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/` | 팀 프로젝트 Jenkins 알림 수신 |
| `GET` | `/history` | 팀 프로젝트 빌드 히스토리 및 결과 조회 |

---

## 8. 에러 처리

시스템 발생 에러는 전역 필터(`GlobalExceptionFilter`)에서 가공되어 반환됩니다:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "이메일 또는 비밀번호를 확인해주세요."
}
```
