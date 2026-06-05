# Metrics API Agent Usage Guide

## 1. 목적
- 이 문서는 품질 메트릭 백엔드를 에이전트 또는 자동화 도구가 직접 호출할 때 필요한 최소 계약을 정리한다.
- 대상 범위는 `API Key` 인증, 메트릭 분석 실행, 분석 이력 조회, `ast_json` 및 `source_code` 입력 방식이다.

## 2. 기본 정보
- Base URL: `http://localhost:13000/api`
- 인증 헤더: `Authorization: Bearer <jwtToken 또는 apiKey>`
- 분석 대상 프로젝트: 현재는 `teamProjectId`가 반드시 필요하다.

## 3. 인증 방식

### 3.1 JWT
- 사람 사용자가 로그인 후 발급받는 토큰이다.
- 주로 초기 테스트, 관리자 기능, API Key 발급에 사용한다.

```http
Authorization: Bearer <jwtToken>
```

### 3.2 API Key
- 에이전트나 자동화 도구가 장기적으로 사용하는 인증 수단이다.
- 형식은 `cv_live_...` 이다.

```http
Authorization: Bearer <apiKey>
```

## 4. 권장 호출 흐름
1. 사용자 회원가입 또는 기존 사용자 준비
2. 로그인 후 JWT 발급
3. `POST /api/api-keys`로 API Key 발급
4. 이후 에이전트는 JWT 대신 API Key로 호출
5. `POST /api/analyses`로 분석 실행
6. `GET /api/analyses` 또는 `GET /api/analyses/:id`로 결과 조회

## 5. API Key 발급

### 5.1 요청
- Endpoint: `POST /api/api-keys`
- 인증: JWT 필요

```json
{
  "name": "codex-local"
}
```

### 5.2 응답 예시
```json
{
  "success": true,
  "statusCode": 201,
  "message": "API key created successfully",
  "data": {
    "id": 1,
    "name": "codex-local",
    "prefix": "cvk_914388a8",
    "expiresAt": null,
    "lastUsedAt": null,
    "revokedAt": null,
    "teamProjectId": null,
    "apiKey": "cv_live_..."
  }
}
```

### 5.3 주의
- `apiKey` 원문은 발급 시점에만 반환된다.
- 이후 목록 조회에서는 `prefix`만 보이고 원문 키는 다시 노출되지 않는다.

## 6. 분석 실행 방식

### 6.1 공통 필드
- `teamProjectId`: 분석 대상 프로젝트 ID
- `analysisType`: 현재 `full`, `classic`, `ck`, `oo`, `smells`
- `sourceType`: `ast_json` 또는 `source_code`
- `filePath`: 분석 대상 파일 경로 또는 파일명

### 6.2 `ast_json` 방식
- 사용처: AST를 이미 가진 내부 시스템 또는 parser 선행 처리 흐름
- 필수: `astData`

#### 요청 예시
```json
{
  "teamProjectId": 1,
  "analysisType": "full",
  "sourceType": "ast_json",
  "filePath": "src/services/report.service.ts",
  "astData": {
    "type": "program",
    "children": []
  }
}
```

### 6.3 `source_code` 방식
- 사용처: 에이전트가 소스코드 문자열만 가지고 있을 때
- 백엔드가 parser `/analyze-source`를 호출해 AST를 만든 뒤 기존 메트릭 엔진으로 넘긴다.
- 필수:
  - `sourceCode`
  - `language` 또는 `filePath`

#### 요청 예시
```json
{
  "teamProjectId": 1,
  "analysisType": "full",
  "sourceType": "source_code",
  "filePath": "Hello.java",
  "language": "java",
  "sourceCode": "public class Hello { public static void main(String[] args) { System.out.println(\"hi\"); } }"
}
```

## 7. 분석 실행 API

### 7.1 Endpoint
- `POST /api/analyses`

### 7.2 API Key 예시
```bash
curl -X POST 'http://localhost:13000/api/analyses' \
  -H 'accept: */*' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer cv_live_example' \
  -d '{
    "teamProjectId": 1,
    "analysisType": "full",
    "sourceType": "source_code",
    "filePath": "Hello.java",
    "language": "java",
    "sourceCode": "public class Hello { public static void main(String[] args) { System.out.println(\"hi\"); } }"
  }'
```

### 7.3 성공 응답 예시
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Metric analysis created successfully",
  "data": {
    "jobId": 5,
    "status": "SUCCESS",
    "teamProjectId": 1,
    "analysisType": "full",
    "result": {
      "summary": {
        "classCount": 2,
        "codeSmellCount": 0
      },
      "classic": {},
      "ck": [],
      "oo": [],
      "smells": []
    }
  }
}
```

## 8. 분석 이력 조회

### 8.1 목록 조회
- Endpoint: `GET /api/analyses`

```bash
curl -X GET 'http://localhost:13000/api/analyses' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer cv_live_example'
```

### 8.2 목록 응답 예시
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Metric analyses retrieved successfully",
  "data": [
    {
      "jobId": 5,
      "status": "SUCCESS",
      "teamProjectId": 1,
      "analysisType": "full",
      "filePath": "Hello.java",
      "requestedAt": "2026-06-05T09:00:00.000Z",
      "completedAt": "2026-06-05T09:00:01.000Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

### 8.3 상세 조회
- Endpoint: `GET /api/analyses/:id`

```bash
curl -X GET 'http://localhost:13000/api/analyses/5' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer cv_live_example'
```

### 8.4 상세 응답 예시
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Metric analysis retrieved successfully",
  "data": {
    "jobId": 5,
    "status": "SUCCESS",
    "teamProjectId": 1,
    "analysisType": "full",
    "filePath": "Hello.java",
    "requestedAt": "2026-06-05T09:00:00.000Z",
    "completedAt": "2026-06-05T09:00:01.000Z",
    "errorMessage": null,
    "result": {
      "summary": {},
      "classic": {},
      "ck": [],
      "oo": [],
      "smells": []
    }
  }
}
```

## 9. 에러 및 주의사항

### 9.1 인증 오류
- `401 Unauthorized`
- 원인:
  - JWT 형식 오류
  - 폐기된 API Key
  - 잘못된 API Key

### 9.2 권한 오류
- `403 Forbidden`
- 원인:
  - 요청 사용자가 해당 `teamProjectId`에 속하지 않음
  - API Key가 접근 가능한 프로젝트 범위를 벗어남

### 9.3 parser 연결 오류
- `502 Bad Gateway`
- 메시지 예: `Failed to reach parser source API.`
- 원인:
  - parser 서버 미기동
  - `PARSER_SOURCE_URL` 오설정
  - parser 포트 불일치

### 9.4 입력 검증 오류
- `400 Bad Request`
- 대표 원인:
  - `sourceType=ast_json`인데 `astData` 없음
  - `sourceType=source_code`인데 `sourceCode` 없음
  - `sourceType=source_code`인데 `language`, `filePath` 둘 다 없음

## 10. 운영 전 확인 항목
- parser 서버 기동 여부
- `PARSER_URL`, `PARSER_SOURCE_URL` 환경변수 확인
- `teamProjectId`와 사용자/키 권한 관계 확인
- 발급한 API Key 원문 보관 여부 확인

## 11. 현재 검증 범위
- JWT 기준 `api-keys`, `analyses` 실행/조회 검증 완료
- API Key 기준 `analyses` 실행/조회 검증 완료
- `sourceType=ast_json` 검증 완료
- `sourceType=source_code` 검증 완료
- `sourceCode -> parser -> astData -> metric analysis` 검증 완료
