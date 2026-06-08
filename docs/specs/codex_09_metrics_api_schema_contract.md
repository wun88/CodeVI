# Specification: Metrics API Schema & Contract MVP

## 1. Objective (목표)
`Metrics API Service MVP`를 실제 구현 가능한 수준으로 구체화하기 위해, 데이터베이스 스키마와 REST API 계약을 정의한다. 기존 `User`, `TeamProject`, `metric` 모듈을 최대한 재사용하며, 사용자와 에이전트가 동일한 계약으로 분석 기능을 호출할 수 있도록 한다.

## 2. Tech Stack (기술 스택)
- **Backend**: NestJS, TypeORM
- **Database**: MySQL
- **Auth**: JWT + API Key
- **API Docs**: Swagger DTO 기반 문서화
- **Serialization**: JSON 중심 응답, 상세 메트릭은 JSON 컬럼 또는 직렬화 가능한 구조 활용

## 3. Data Model Strategy (데이터 모델 전략)
- 신규 프로젝트 엔티티를 추가하지 않고, 기존 `TeamProject`를 MVP의 프로젝트 소유 단위로 사용한다.
- 사용자 직접 로그인 세션은 JWT를 사용한다.
- 에이전트 및 외부 호출은 API Key 인증을 사용한다.
- 계산 엔진은 기존 `MetricService`를 재사용하고, 별도 분석 요청/결과 엔티티를 통해 기록과 재조회 기능을 제공한다.

## 4. Database Schema (DB 스키마)

### Phase 1: API Key 엔티티 설계
#### Entity: `ApiKey`
- `id`
- `name`: 키 식별용 별칭
- `prefix`: 사용자에게 표시할 짧은 prefix
- `hashedKey`: 원문 키 해시값
- `lastUsedAt`: 마지막 사용 시각
- `expiresAt`: 만료 시각(optional)
- `revokedAt`: 폐기 시각(optional)
- `user`: `ManyToOne(User)`
- `teamProject`: `ManyToOne(TeamProject, nullable=true)`

#### 정책
- 원문 API Key는 생성 시 1회만 응답한다.
- DB에는 `hashedKey`만 저장한다.
- 키 범위를 전역 사용자용 또는 특정 `TeamProject` 전용으로 설정 가능하게 설계한다.

### Phase 2: 분석 요청 엔티티 설계
#### Entity: `MetricAnalysisJob`
- `id`
- `status`: `PENDING | SUCCESS | FAILED`
- `analysisType`: `classic | ck | oo | smells | full`
- `filePath`
- `sourceType`: `source_code | ast_json`
- `requestedByUser`: `ManyToOne(User, nullable=true)`
- `apiKey`: `ManyToOne(ApiKey, nullable=true)`
- `teamProject`: `ManyToOne(TeamProject)`
- `errorMessage`: 실패 시 메시지
- `requestedAt`
- `completedAt`

#### 입력 저장 원칙
- MVP에서는 원본 입력 전체를 장기 저장하지 않는다.
- 민감한 소스 보관 이슈를 줄이기 위해, 기본값은 요청 메타데이터와 결과 중심 저장으로 제한한다.
- 필요 시 디버깅 모드에서만 입력 스냅샷 저장을 허용한다.

### Phase 3: 분석 결과 엔티티 설계
#### Entity: `MetricAnalysisResult`
- `id`
- `job`: `OneToOne(MetricAnalysisJob)`
- `summaryJson`: 프로젝트/파일 요약 결과
- `classicJson`: 고전적 메트릭 결과
- `ckJson`: 클래스별 CK 메트릭 결과
- `ooJson`: 클래스별 OO 메트릭 결과
- `smellsJson`: 코드 스멜 결과

#### 저장 전략
- MVP는 정규화보다 빠른 구현을 우선하여 JSON 컬럼 중심으로 저장한다.
- 추후 통계 집계가 늘어나면 일부 필드를 별도 테이블로 승격한다.

## 5. REST API Contract (API 계약)

### Phase 1: 인증 및 API Key 관리
#### `POST /api/auth/signup`
- 목적: 로컬 사용자 계정 생성
- 요청
```json
{
  "email": "user@example.com",
  "username": "metric-user",
  "password": "plain-text-password"
}
```
- 응답
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "metric-user"
}
```

#### `POST /api/auth/login`
- 목적: JWT 발급
- 요청
```json
{
  "email": "user@example.com",
  "password": "plain-text-password"
}
```
- 응답
```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "metric-user"
  }
}
```

#### `POST /api/api-keys`
- 목적: 새 API Key 발급
- 인증: JWT
- 요청
```json
{
  "name": "codex-local",
  "teamProjectId": 3,
  "expiresAt": "2026-12-31T00:00:00.000Z"
}
```
- 응답
```json
{
  "id": 10,
  "name": "codex-local",
  "prefix": "cvk_ab12",
  "apiKey": "cv_live_xxxxxxxxx",
  "expiresAt": "2026-12-31T00:00:00.000Z"
}
```

#### `GET /api/api-keys`
- 목적: 발급된 키 목록 조회
- 인증: JWT
- 응답에는 원문 키를 포함하지 않는다.

#### `DELETE /api/api-keys/:id`
- 목적: 키 폐기
- 인증: JWT

### Phase 2: 프로젝트 조회
#### `GET /api/projects`
- 목적: 사용자가 접근 가능한 `TeamProject` 목록 조회
- 인증: JWT
- 비고: MVP에서는 기존 `TeamProject`를 재사용하므로 생성 API는 후순위로 둘 수 있다.

### Phase 3: 분석 요청
#### `POST /api/analyses`
- 목적: 메트릭 분석 실행 및 저장
- 인증: `JWT` 또는 `Authorization: Bearer <apiKey>`
- 요청
```json
{
  "teamProjectId": 3,
  "analysisType": "full",
  "filePath": "src/services/report.service.ts",
  "sourceType": "source_code",
  "sourceCode": "export class ReportService {}"
}
```

또는

```json
{
  "teamProjectId": 3,
  "analysisType": "ck",
  "sourceType": "ast_json",
  "astData": {
    "type": "program",
    "children": []
  }
}
```

- 응답
```json
{
  "jobId": 101,
  "status": "SUCCESS",
  "teamProjectId": 3,
  "analysisType": "full",
  "result": {
    "summary": {
      "classCount": 1,
      "codeSmellCount": 0
    },
    "classic": {
      "cyclomaticComplexity": 1
    },
    "ck": [],
    "oo": [],
    "smells": []
  }
}
```

### Phase 4: 분석 이력 조회
#### `GET /api/analyses`
- 목적: 프로젝트 또는 사용자 기준 분석 이력 목록 조회
- 인증: JWT
- 쿼리 예시
  - `teamProjectId`
  - `analysisType`
  - `status`

#### `GET /api/analyses/:id`
- 목적: 저장된 분석 결과 단건 조회
- 인증: JWT 또는 해당 범위의 API Key

## 6. Validation & Error Policy (검증 및 오류 정책)
- `401 Unauthorized`: JWT 또는 API Key 검증 실패
- `403 Forbidden`: 사용자 또는 키가 해당 `TeamProject`에 접근 권한 없음
- `400 Bad Request`: `sourceType`과 실제 payload가 일치하지 않음
- `422 Unprocessable Entity`: AST 형식은 맞지만 메트릭 계산 불가
- `500 Internal Server Error`: 서버 내부 예외

## 7. Acceptance Criteria (검증 기준)
- [ ] 기존 `User`, `TeamProject` 모델과 충돌 없이 신규 엔티티 관계가 정의된다.
- [ ] API Key는 해시 저장 정책을 만족한다.
- [ ] `POST /api/analyses` 하나로 사용자와 에이전트 호출을 모두 처리할 수 있다.
- [ ] 분석 결과는 재조회 가능한 형태로 저장된다.
- [ ] Swagger에서 요청/응답 예시와 인증 방식이 드러난다.

## 8. Dependencies (의존성)
- 기존 `users`, `auth`, `team-project`, `metric` 모듈
- 공통 응답 래퍼 및 예외 처리 인터셉터 정책
- TypeORM 엔티티 및 마이그레이션 반영 전략

## 9. Out of Scope (이번 명세 제외 범위)
- API 사용량 과금
- 웹 대시보드 UI 상세 설계
- Git 저장소 URL 직접 분석
- 장기 보관용 원본 소스 아카이브
- 큐 기반 비동기 워커 분리
