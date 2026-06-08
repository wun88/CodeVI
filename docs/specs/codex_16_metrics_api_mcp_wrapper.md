# Metrics API MCP Wrapper Spec

## 1. 목표
- 기존 Metrics API 백엔드를 에이전트가 `tool` 형태로 직접 사용할 수 있도록 MCP 래퍼를 설계한다.
- REST API 호출 세부사항을 MCP 서버 내부로 감추고, 에이전트에는 분석 실행 및 조회 중심의 명확한 도구 인터페이스를 제공한다.
- 초기 범위는 `API Key` 기반 사용을 우선으로 하며, JWT 흐름은 운영자/수동 테스트 용도로만 유지한다.

## 2. 배경
- 현재 백엔드는 아래 흐름을 이미 지원한다.
  - `POST /api/api-keys`
  - `POST /api/analyses`
  - `GET /api/analyses`
  - `GET /api/analyses/:id`
- `sourceType=ast_json`과 `sourceType=source_code` 모두 검증이 끝났다.
- 하지만 에이전트는 HTTP 헤더, JSON 구조, parser 연동 여부를 직접 알 필요가 없고, `tool invocation` 중심 인터페이스가 더 적합하다.

## 3. 대상 범위

### 3.1 포함
- MCP 서버 또는 MCP 어댑터 프로세스 설계
- Metrics API 호출용 환경변수 계약 정의
- 에이전트 노출용 tool 목록 정의
- 요청/응답 매핑 규칙 정의
- 기본 에러 변환 정책 정의

### 3.2 제외
- 백엔드 API 자체의 인증/분석 로직 재구현
- 과금, rate limit, quota 시스템
- 멀티 테넌시 운영 UI
- OAuth 기반 사용자 로그인 흐름

## 4. 제안 아키텍처

### 4.1 구성
1. 에이전트
2. MCP Wrapper Server
3. Metrics API Backend
4. Parser Server

### 4.2 책임 분리
- Metrics API Backend
  - 인증 검증
  - 분석 실행
  - 결과 저장 및 조회
- MCP Wrapper
  - 백엔드 Base URL, API Key 로딩
  - tool 입력값 검증
  - REST 요청 생성
  - 응답 정규화
  - 에러 메시지 단순화

## 5. 환경변수 계약
- `CODEVI_METRICS_BASE_URL`
  - 예: `http://localhost:13000/api`
- `CODEVI_METRICS_API_KEY`
  - 예: `cv_live_...`
- 선택:
  - `CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID`
  - `CODEVI_METRICS_REQUEST_TIMEOUT_MS`

## 6. Tool 목록

### 6.1 `run_metric_analysis`
- 목적: 메트릭 분석 실행
- 백엔드 매핑: `POST /api/analyses`

#### 입력
```json
{
  "teamProjectId": 1,
  "analysisType": "full",
  "sourceType": "source_code",
  "filePath": "Hello.java",
  "language": "java",
  "sourceCode": "public class Hello {}"
}
```

#### 출력
```json
{
  "jobId": 5,
  "status": "SUCCESS",
  "teamProjectId": 1,
  "analysisType": "full",
  "result": {
    "summary": {},
    "classic": {},
    "ck": [],
    "oo": [],
    "smells": []
  }
}
```

### 6.2 `list_metric_analyses`
- 목적: 분석 이력 목록 조회
- 백엔드 매핑: `GET /api/analyses`

#### 입력
```json
{
  "teamProjectId": 1,
  "analysisType": "full",
  "status": "SUCCESS"
}
```

#### 출력
```json
{
  "items": [
    {
      "jobId": 5,
      "status": "SUCCESS",
      "teamProjectId": 1,
      "analysisType": "full",
      "filePath": "Hello.java"
    }
  ],
  "total": 1
}
```

### 6.3 `get_metric_analysis`
- 목적: 특정 분석 상세 조회
- 백엔드 매핑: `GET /api/analyses/:id`

#### 입력
```json
{
  "jobId": 5
}
```

#### 출력
```json
{
  "jobId": 5,
  "status": "SUCCESS",
  "analysisType": "full",
  "filePath": "Hello.java",
  "result": {
    "summary": {},
    "classic": {},
    "ck": [],
    "oo": [],
    "smells": []
  }
}
```

## 7. 입력 정책

### 7.1 `run_metric_analysis`
- `teamProjectId`가 없으면:
  - `CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID`가 있으면 대체
  - 없으면 에러
- `sourceType=ast_json`이면 `astData` 필수
- `sourceType=source_code`이면 `sourceCode` 필수
- `sourceType=source_code`이면 `language` 또는 `filePath` 중 하나는 필수

### 7.2 `list_metric_analyses`
- 모든 필터는 optional
- 필터가 없으면 현재 키가 접근 가능한 범위 전체를 조회

## 8. 인증 정책
- MCP Wrapper는 `Authorization: Bearer <CODEVI_METRICS_API_KEY>`를 자동으로 붙인다.
- JWT 기반 호출은 MCP 범위에서 기본 지원하지 않는다.
- 이유:
  - 에이전트 사용 시 장기 인증은 API Key가 더 적합함
  - 로그인 세션 의존도를 제거할 수 있음

## 9. 에러 변환 규칙
- 백엔드 `401`
  - MCP 에러: `Invalid or expired API key.`
- 백엔드 `403`
  - MCP 에러: `No access to the requested team project or analysis.`
- 백엔드 `404`
  - MCP 에러: `Requested analysis was not found.`
- 백엔드 `502`
  - MCP 에러: `Parser service is unavailable or misconfigured.`
- 백엔드 `400`
  - MCP 에러: 원본 메시지를 최대한 유지하되 입력 필드명을 포함

## 10. 구현 단계

### Phase 1. Wrapper 기본 구조
- MCP 서버 엔트리포인트 생성
- 환경변수 로딩
- 공통 HTTP 클라이언트 작성

### Phase 2. 분석 Tool 연결
- `run_metric_analysis`
- `list_metric_analyses`
- `get_metric_analysis`

### Phase 3. 응답 정규화
- 백엔드 `success/statusCode/message/data` 구조를 tool 친화적 형태로 축약
- 불필요한 envelope 제거

### Phase 4. 에러 변환 및 검증
- HTTP 에러별 메시지 단순화
- 필수 입력값 검증

### Phase 5. 수동 검증
- 실제 발급된 API Key로 tool 호출
- `source_code`와 `ast_json` 두 경로 확인

## 11. Acceptance Criteria
- MCP Wrapper가 API Key만으로 Metrics API를 호출할 수 있다.
- 에이전트는 HTTP 세부사항 없이 tool 입력만으로 분석 실행이 가능하다.
- `run_metric_analysis`, `list_metric_analyses`, `get_metric_analysis`가 정상 동작한다.
- `source_code`와 `ast_json` 두 입력 방식이 모두 지원된다.
- parser 미기동, 권한 없음, 키 오류 같은 대표 에러가 사람이 이해 가능한 메시지로 변환된다.

## 12. 의존성
- Metrics API Backend 서버 기동
- 유효한 API Key 발급 상태
- parser 서버 기동 상태 (`source_code` 경로 검증 시)
- MCP 실행 환경 또는 에이전트 연결 런타임

## 13. 다음 연결 문서
- [codex_15_metrics_api_agent_usage_guide.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_15_metrics_api_agent_usage_guide.md)
- [codex_14_metrics_api_test_samples.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_14_metrics_api_test_samples.md)
- [2026-06-04_metrics_api_mvp_progress.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/history/byoon/06(agent)/2026-06-04_metrics_api_mvp_progress.md)
