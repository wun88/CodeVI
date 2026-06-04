# Specification: Metrics API Test Samples

## 1. Objective (목표)
현재 구현된 `API Key`, `Metric Analysis Execution`, `Metric Analysis Query` 기능을 빠르게 검증할 수 있도록 테스트용 요청/응답 샘플을 정리한다. 사람 사용자와 에이전트 사용자가 모두 같은 흐름을 이해할 수 있어야 한다.

## 2. Tech Stack (기술 스택)
- **Backend**: NestJS REST API
- **Auth**: JWT, API Key
- **Test Clients**: Swagger, Postman, curl
- **Response Format**: `ApiResponseDto`

## 3. Preconditions (사전 조건)
- 백엔드 서버가 실행 중이어야 한다.
- 전역 prefix로 인해 모든 API 경로는 `/api` 하위에 존재한다.
- 최소 1개의 `User`와 1개의 접근 가능한 `TeamProject`가 존재해야 한다.
- `Metric Analysis`는 현재 MVP 기준으로 `astData` 입력이 필수다.

## 4. Test Scenarios (테스트 시나리오)

### Phase 1: JWT 로그인
#### Request
`POST /api/auth/signin`

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

#### Expected Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": {
    "jwtToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Verification Point
- 응답 헤더 또는 응답 본문에서 JWT를 확보할 수 있어야 한다.

### Phase 2: API Key 발급
#### Request
`POST /api/api-keys`

Header:
`Authorization: Bearer <jwtToken>`

```json
{
  "name": "codex-local",
  "teamProjectId": 3,
  "expiresAt": "2026-12-31T00:00:00.000Z"
}
```

#### Expected Response
```json
{
  "success": true,
  "statusCode": 201,
  "message": "API key created successfully",
  "data": {
    "id": 10,
    "name": "codex-local",
    "prefix": "cvk_ab12cd34",
    "expiresAt": "2026-12-31T00:00:00.000Z",
    "lastUsedAt": null,
    "revokedAt": null,
    "teamProjectId": 3,
    "apiKey": "cv_live_0123456789abcdef"
  }
}
```

#### Verification Point
- `apiKey` 원문은 발급 응답에서만 보여야 한다.
- 이후 목록 조회에서는 원문이 다시 노출되면 안 된다.

### Phase 3: API Key 목록 조회
#### Request
`GET /api/api-keys`

Header:
`Authorization: Bearer <jwtToken>`

#### Expected Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "API keys retrieved successfully",
  "data": [
    {
      "id": 10,
      "name": "codex-local",
      "prefix": "cvk_ab12cd34",
      "expiresAt": "2026-12-31T00:00:00.000Z",
      "lastUsedAt": null,
      "revokedAt": null,
      "teamProjectId": 3
    }
  ],
  "meta": {
    "total": 1
  }
}
```

#### Verification Point
- `hashedKey`, `apiKey` 원문이 응답에 포함되지 않아야 한다.

### Phase 4: JWT로 메트릭 분석 실행
#### Request
`POST /api/analyses`

Header:
`Authorization: Bearer <jwtToken>`

```json
{
  "teamProjectId": 3,
  "analysisType": "full",
  "sourceType": "ast_json",
  "filePath": "src/services/report.service.ts",
  "astData": {
    "type": "program",
    "children": []
  },
  "sourceCode": "export class ReportService {}"
}
```

#### Expected Response
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Metric analysis created successfully",
  "data": {
    "jobId": 101,
    "status": "SUCCESS",
    "teamProjectId": 3,
    "analysisType": "full",
    "result": {
      "summary": {
        "classCount": 0,
        "codeSmellCount": 0
      },
      "classic": {
        "cyclomaticComplexity": 1,
        "halstead": {
          "n1": 0,
          "n2": 0,
          "N1": 0,
          "N2": 0,
          "vocabulary": 0,
          "length": 0,
          "volume": 0,
          "difficulty": 0,
          "effort": 0,
          "time": 0,
          "bugs": 0
        },
        "size": {
          "loc": 1,
          "sloc": 1,
          "cloc": 0,
          "ncloc": 1
        }
      },
      "ck": [],
      "oo": [],
      "smells": []
    }
  }
}
```

#### Verification Point
- `jobId`가 반환되어야 한다.
- `status`는 정상 입력 기준 `SUCCESS`여야 한다.

### Phase 5: API Key로 메트릭 분석 실행
#### Request
`POST /api/analyses`

Header:
`Authorization: Bearer <apiKey>`

```json
{
  "teamProjectId": 3,
  "analysisType": "classic",
  "sourceType": "ast_json",
  "filePath": "src/services/report.service.ts",
  "astData": {
    "type": "program",
    "children": []
  }
}
```

#### Expected Response
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Metric analysis created successfully",
  "data": {
    "jobId": 102,
    "status": "SUCCESS",
    "teamProjectId": 3,
    "analysisType": "classic",
    "result": {
      "summary": {
        "classCount": 0,
        "codeSmellCount": 0
      },
      "classic": {
        "cyclomaticComplexity": 1,
        "halstead": {
          "n1": 0,
          "n2": 0,
          "N1": 0,
          "N2": 0,
          "vocabulary": 0,
          "length": 0,
          "volume": 0,
          "difficulty": 0,
          "effort": 0,
          "time": 0,
          "bugs": 0
        },
        "size": {
          "loc": 1,
          "sloc": 0,
          "cloc": 0,
          "ncloc": 0
        }
      },
      "ck": null,
      "oo": null,
      "smells": null
    }
  }
}
```

#### Verification Point
- JWT 없이 API Key만으로 요청이 통과해야 한다.
- `lastUsedAt` 값이 이후 목록 조회에서 갱신되어야 한다.

### Phase 6: 분석 이력 목록 조회
#### Request
`GET /api/analyses?teamProjectId=3&status=SUCCESS`

Header:
`Authorization: Bearer <jwtToken 또는 apiKey>`

#### Expected Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Metric analyses retrieved successfully",
  "data": [
    {
      "jobId": 102,
      "status": "SUCCESS",
      "teamProjectId": 3,
      "analysisType": "classic",
      "filePath": "src/services/report.service.ts",
      "requestedAt": "2026-06-04T12:00:00.000Z",
      "completedAt": "2026-06-04T12:00:01.000Z"
    },
    {
      "jobId": 101,
      "status": "SUCCESS",
      "teamProjectId": 3,
      "analysisType": "full",
      "filePath": "src/services/report.service.ts",
      "requestedAt": "2026-06-04T11:59:00.000Z",
      "completedAt": "2026-06-04T11:59:01.000Z"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

#### Verification Point
- 최신순으로 정렬되어야 한다.
- 접근 가능한 `TeamProject` 범위 밖의 데이터는 보이지 않아야 한다.

### Phase 7: 분석 결과 단건 조회
#### Request
`GET /api/analyses/101`

Header:
`Authorization: Bearer <jwtToken 또는 apiKey>`

#### Expected Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Metric analysis retrieved successfully",
  "data": {
    "jobId": 101,
    "status": "SUCCESS",
    "teamProjectId": 3,
    "analysisType": "full",
    "filePath": "src/services/report.service.ts",
    "requestedAt": "2026-06-04T11:59:00.000Z",
    "completedAt": "2026-06-04T11:59:01.000Z",
    "errorMessage": null,
    "result": {
      "summary": {
        "classCount": 0,
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
}
```

#### Verification Point
- 목록보다 더 상세한 `result` 구조가 포함되어야 한다.

### Phase 8: 오류 시나리오 검증
#### Case A: 인증 없이 호출
- 요청: `GET /api/analyses`
- 기대 결과: `401 Unauthorized`

#### Case B: 잘못된 API Key
- 요청 헤더: `Authorization: Bearer cv_live_invalid`
- 기대 결과: `401 Unauthorized`

#### Case C: 권한 없는 프로젝트 접근
- 요청: `POST /api/analyses` with foreign `teamProjectId`
- 기대 결과: `403 Forbidden`

#### Case D: 필수 `astData` 누락
- 요청: `POST /api/analyses`
- 기대 결과: `400 Bad Request`

## 5. curl Samples (빠른 수동 테스트)

### JWT 로그인
```bash
curl -X POST http://localhost:13000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password1234"
  }'
```

### API Key 발급
```bash
curl -X POST http://localhost:13000/api/api-keys \
  -H "Authorization: Bearer <jwtToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "codex-local",
    "teamProjectId": 3
  }'
```

### 분석 실행
```bash
curl -X POST http://localhost:13000/api/analyses \
  -H "Authorization: Bearer <apiKey>" \
  -H "Content-Type: application/json" \
  -d '{
    "teamProjectId": 3,
    "analysisType": "full",
    "sourceType": "ast_json",
    "filePath": "src/services/report.service.ts",
    "astData": {
      "type": "program",
      "children": []
    }
  }'
```

### 분석 목록 조회
```bash
curl http://localhost:13000/api/analyses?teamProjectId=3 \
  -H "Authorization: Bearer <apiKey>"
```

## 6. Acceptance Criteria (검증 기준)
- [ ] JWT 사용자 기준 발급, 실행, 조회 흐름이 문서화되어 있다.
- [ ] API Key 기준 실행, 조회 흐름이 문서화되어 있다.
- [ ] 정상/오류 케이스가 모두 포함되어 있다.
- [ ] Swagger, Postman, curl 중 하나로 바로 재현 가능한 수준의 샘플이 제공된다.

## 7. Dependencies (의존성)
- [codex_10_api_key_management.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_10_api_key_management.md)
- [codex_12_metric_analysis_execution_api.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_12_metric_analysis_execution_api.md)
- [codex_13_metric_analysis_query_api.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_13_metric_analysis_query_api.md)
