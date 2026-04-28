# Frontend API Specification

> 이 문서는 백엔드의 `api_specification.md`를 기준으로 프론트엔드 연동을 위해 작성/최신화된 문서입니다. 
> - **Base URL:** `http://localhost:13000/api`
> - **공통 인증 방식:** JWT 토큰 (`Authorization: Bearer <token>`)
> - **응답 형식:** `ApiResponseDto<T>` 형태 (아래 참조)

## 공통 응답 구조
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청 성공",
  "data": { ... },
  "meta": { "total": 10 }
}
```

---

## 1. 인증 관리 (Auth)
**기본 경로:** `/auth`

| 메서드 | 엔드포인트 | 역할 | 필요 헤더 |
|---|---|---|---|
| `POST` | `/signup` | 회원가입 | - |
| `POST` | `/signin` | 로그인 (JWT 반환) | - |
| `GET`  | `/google/signin` | 구글 폼 리디렉션 | - |
| `GET`  | `/google/callback` | 구글 로그인 콜백 | - |
| `GET`  | `/attendance/:classId/:sessionId` | 출석 토큰 생성 | Authorization |

---

## 2. 사용자 관리 (Users)
**기본 경로:** `/users`

| 메서드 | 엔드포인트 | 역할 |
|---|---|---|
| `GET`    | `/` | 모든 사용자 페이징 조회 |
| `GET`    | `/:id` | 특정 사용자 조회 |
| `PUT`    | `/:id` | 사용자 정보 수정 |
| `DELETE` | `/:id` | 사용자 계정 삭제 |
| `POST`   | `/logout` | 로그아웃 (토큰/쿠키 삭제 요청) |

---

## 3. 팀 프로젝트 (TeamProject)
**기본 경로:** `/team-projects`

| 메서드 | 엔드포인트 | 역할 |
|---|---|---|
| `POST` | `/` | Jenkins 통보 및 팀 프로젝트 분석 시작 |
| `GET`  | `/history` | 빌드/분석 히스토리 리스트 조회 |

---

## 4. 메트릭 분석 (Metrics)
**기본 경로:** `/metrics`

| 메서드 | 엔드포인트 | 역할 |
|---|---|---|
| `POST` | `/analyze` | 최상위 파일 통합 메트릭 분석 |
| `POST` | `/analyze/classic` | 사이클로매틱, 할스테드 등 기본 지표 계산 |
| `POST` | `/analyze/ck` | CK Metrics 분석 (WMC, DIT, RFC, CBO 등) |
| `POST` | `/analyze/oo` | OO Metrics 10종 분석 |
| `POST` | `/analyze/smells` | 코드 스멜 감지 |
| `POST` | `/complexity` | 단독 순환 복잡도 계산 |
| `POST` | `/halstead` | 단독 Halstead 연산 |
| `POST` | `/size` | 단독 Size 메트릭(LOC 등) 연산 |

---

## 5. 관계형 AST 관리 (AST Relational) - 시각화 핵심 API
**기본 경로:** `/ast-data/relational`

| 메서드 | 엔드포인트 | 역할 |
|---|---|---|
| `POST` | `/` | 정규화된 AST 데이터 저장 (Jenkins에서) |
| `GET`  | `/` | 전체 AST 스냅샷 목록 조회 |
| `GET`  | `/:snapshotId` | 특정 스냅샷 상세 조회 (노드/엣지 구성용 데이터) |
| `GET`  | `/benchmark/.../:snapshotId` | 각 방식별 속도 및 벤치마킹 조회 3종 |
