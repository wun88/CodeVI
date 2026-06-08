# Metrics MCP Config Examples

## 1. 목적
- Metrics API MCP Wrapper를 실제 에이전트 환경에 연결할 때 바로 참고할 수 있는 설정 예시를 제공한다.
- 대상은 로컬 개발 환경 기준이며, `stdio` 기반 MCP 실행을 전제로 한다.

## 2. 사전 조건
- Metrics API Backend 실행 중
  - `http://localhost:13000/api`
- 유효한 API Key 확보
  - 예: `cv_live_...`
- parser 기반 `source_code` 분석을 쓸 경우 parser 서버도 실행 중

## 3. 환경 변수 예시

```env
CODEVI_METRICS_BASE_URL=http://localhost:13000/api
CODEVI_METRICS_API_KEY=cv_live_example
CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID=1
CODEVI_METRICS_REQUEST_TIMEOUT_MS=15000
```

## 4. 로컬 MCP 설정 예시

### 4.1 일반 JSON 예시
```json
{
  "codevi-metrics": {
    "command": "node",
    "args": [
      "/absolute/path/to/code-vi-internal/code-vi-back/dist/mcp/codevi-metrics-server.js"
    ],
    "env": {
      "CODEVI_METRICS_BASE_URL": "http://localhost:13000/api",
      "CODEVI_METRICS_API_KEY": "cv_live_example",
      "CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID": "1",
      "CODEVI_METRICS_REQUEST_TIMEOUT_MS": "15000"
    }
  }
}
```

### 4.2 개발 중 TypeScript 직접 실행 예시
- 프로덕션보다는 개발/디버깅용이다.

```json
{
  "codevi-metrics-dev": {
    "command": "npx",
    "args": [
      "ts-node",
      "/absolute/path/to/code-vi-internal/code-vi-back/src/mcp/codevi-metrics-server.ts"
    ],
    "env": {
      "CODEVI_METRICS_BASE_URL": "http://localhost:13000/api",
      "CODEVI_METRICS_API_KEY": "cv_live_example",
      "CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID": "1"
    }
  }
}
```

## 5. Codex 스타일 설정 예시
- 실제 클라이언트별 필드명은 다를 수 있으므로 `command`, `args`, `env` 구조만 핵심으로 본다.

```json
{
  "mcpServers": {
    "codevi-metrics": {
      "command": "node",
      "args": [
        "/absolute/path/to/code-vi-internal/code-vi-back/dist/mcp/codevi-metrics-server.js"
      ],
      "env": {
        "CODEVI_METRICS_BASE_URL": "http://localhost:13000/api",
        "CODEVI_METRICS_API_KEY": "cv_live_example",
        "CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID": "1"
      }
    }
  }
}
```

## 6. Tool 사용 예시

### 6.1 `run_metric_analysis`
```json
{
  "name": "run_metric_analysis",
  "arguments": {
    "analysisType": "full",
    "sourceType": "source_code",
    "filePath": "Hello.java",
    "language": "java",
    "sourceCode": "public class Hello { public static void main(String[] args) { System.out.println(\"hi\"); } }"
  }
}
```

- `teamProjectId`를 생략하면 `CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID`를 사용한다.

### 6.2 `list_metric_analyses`
```json
{
  "name": "list_metric_analyses",
  "arguments": {
    "teamProjectId": 1,
    "analysisType": "full",
    "status": "SUCCESS"
  }
}
```

### 6.3 `get_metric_analysis`
```json
{
  "name": "get_metric_analysis",
  "arguments": {
    "jobId": 5
  }
}
```

## 7. 기대 응답 예시

### 7.1 `run_metric_analysis`
```json
{
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
```

### 7.2 `list_metric_analyses`
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

## 8. 대표 실패 케이스
- 잘못된 API Key
  - `Invalid or expired API key.`
- 권한 없는 프로젝트
  - `No access to the requested team project or analysis.`
- parser 미기동
  - `Parser service is unavailable or misconfigured.`
- `source_code`인데 `sourceCode` 누락
  - `sourceCode is required when sourceType is source_code.`

## 9. 권장 운영 순서
1. Metrics API Backend 실행
2. parser 서버 실행
3. `npm run build`
4. MCP Wrapper 실행
5. 에이전트 설정 JSON에 `command`, `args`, `env` 등록
6. `run_metric_analysis`로 첫 호출 확인

## 10. 연결 문서
- [codex_16_metrics_api_mcp_wrapper.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_16_metrics_api_mcp_wrapper.md)
- [codex_15_metrics_api_agent_usage_guide.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_15_metrics_api_agent_usage_guide.md)
