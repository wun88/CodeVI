# Metrics API MVP Progress

## 1. 작업 개요
- **일시**: 2026-06-04
- **작업자**: byoon (agent)
- **대상**: `code-vi-internal/code-vi-back` Metrics API Service MVP

## 2. 의도 (Intent)
- 품질 메트릭 계산 기능을 사용자와 에이전트가 공통으로 쓸 수 있는 REST API로 정리한다.
- 기존 `metric` 계산 로직은 유지하고, 그 위에 `API Key`, `분석 실행`, `분석 조회` 계층을 추가한다.
- 구현 전에 명세를 먼저 고정하고, 그 명세 순서대로 코드와 테스트를 진행한다.

## 3. 결과 (Result)
- **주요 명세 작성**
  - [codex_08_metrics_api_mvp.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_08_metrics_api_mvp.md): 상위 MVP 범위 정의
  - [codex_09_metrics_api_schema_contract.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_09_metrics_api_schema_contract.md): 스키마 및 API 계약 정의
  - [codex_10_api_key_management.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_10_api_key_management.md): API Key 관리
  - [codex_11_metric_analysis_entities.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_11_metric_analysis_entities.md): 분석 엔티티
  - [codex_12_metric_analysis_execution_api.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_12_metric_analysis_execution_api.md): 실행 API
  - [codex_13_metric_analysis_query_api.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_13_metric_analysis_query_api.md): 조회 API
  - [codex_14_metrics_api_test_samples.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_14_metrics_api_test_samples.md): 테스트 샘플
  - [codex_15_metrics_api_agent_usage_guide.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_15_metrics_api_agent_usage_guide.md): 에이전트 호출 가이드
  - [codex_16_metrics_api_mcp_wrapper.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_16_metrics_api_mcp_wrapper.md): MCP 래퍼 설계
  - [codex_17_metrics_mcp_config_examples.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_17_metrics_mcp_config_examples.md): MCP 설정 예시
- **주요 코드 변경**
  - `src/api-key/`: `ApiKey` 엔티티, 서비스, 컨트롤러, Guard, DTO 구현
  - `src/metric-analysis/`: `MetricAnalysisJob`, `MetricAnalysisResult`, 실행/조회 API, 복합 인증 Guard 구현
  - `src/metric-analysis/metric-analysis.service.ts`: `sourceType=source_code` 요청 시 parser `/analyze-source` 호출 후 `nodes[0].ast`를 기존 메트릭 엔진으로 전달하는 흐름 추가
  - `src/metric-analysis/dto/create-metric-analysis-request.dto.ts`: `language` 필드 추가 및 source code 요청 입력 모델 보강
  - `src/mcp/codevi-metrics-server.ts`: stdio 기반 최소 MCP Wrapper 구현 (`initialize`, `tools/list`, `tools/call`)
  - [app.module.ts](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/src/app.module.ts): `.env.local` 우선 로딩 및 모듈 등록
  - [main.ts](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/src/main.ts): Swagger bearer auth 및 전역 `ValidationPipe(transform: true)` 설정
  - [metric.module.ts](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/src/metric/metric.module.ts): `MetricService` export
  - [package.json](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/package.json): `start:mcp` 실행 스크립트 추가
  - [README.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/README.md): 로컬 테스트용 env 설명 및 MCP 실행 예시 추가
  - [.env.local.example](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/.env.local.example): 로컬 테스트용 예시 파일 및 `PARSER_SOURCE_URL` 안내 추가

## 4. 검증 결과 (Validation)
- **빌드 검증**
  - [x] `npm run build` 통과
- **런타임 검증**
  - [x] `.env.local` 기반 로컬 MySQL 연결 성공
  - [x] 서버 기동 및 Swagger 확인 (`http://localhost:13000/api`)
  - [x] `POST /api/auth/signup` 성공
  - [x] `POST /api/auth/signin` 성공
  - [x] `POST /api/api-keys` 성공
  - [x] `GET /api/api-keys` 성공
  - [x] 테스트용 `team_project` 및 사용자 연결 데이터 생성
  - [x] JWT 기준 `POST /api/analyses` 성공
  - [x] JWT 기준 `GET /api/analyses` 성공
  - [x] JWT 기준 `GET /api/analyses/:id` 성공
  - [x] API Key 기준 `POST /api/analyses` 성공
  - [x] API Key 기준 `GET /api/analyses` 성공
  - [x] API Key 기준 `GET /api/analyses/:id` 성공
  - [x] parser `/analyze-source` 단건 호출 성공
  - [x] `sourceType=source_code` 기준 `POST /api/analyses` 성공
  - [x] MCP `initialize` 성공
  - [x] MCP `tools/list` 성공
  - [x] MCP `run_metric_analysis` 성공
  - [x] MCP `get_metric_analysis` 성공
  - [x] MCP `list_metric_analyses` 성공
  - [x] 실제 Codex MCP 클라이언트에서 `list_metric_analyses` 성공
  - [x] 실제 Codex MCP 클라이언트에서 `get_metric_analysis(jobId=6)` 성공
  - [x] 실제 Codex MCP 클라이언트에서 `run_metric_analysis(source_code)` 성공
- **검증 요약**
  - [x] `API Key` 발급/조회 흐름 검증 완료
  - [x] JWT 경로 `Metric Analysis` 실행/목록/상세 조회 흐름 검증 완료
  - [x] API Key 경로 `Metric Analysis` 실행/목록/상세 조회 흐름 검증 완료
  - [x] `sourceCode -> parser -> astData -> metric analysis` 자동 연결 경로 검증 완료
  - [x] MCP Wrapper 최소 기능(`run_metric_analysis`, `list_metric_analyses`, `get_metric_analysis`) 검증 완료
  - [x] 실제 Codex 세션에서 `codevi_metrics` MCP 서버 로드 및 tool 호출 검증 완료
  - [x] 현재 범위(`codex_10`~`codex_17`) 수동 검증 완료

## 5. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**
  - 기존 `.env`가 도커 네트워크 기준이라 로컬에서 `codevi-db`를 찾지 못했다.
  - 로컬 MySQL은 `127.0.0.1:3306`에서 동작했지만 초기 `.env.local` 값이 `13306`, `refactory` 기준으로 남아 있었다.
  - Swagger 전역 보안 스키마가 없어 `Authorize` 버튼이 보이지 않았다.
  - `sourceType=source_code` 경로 구현 중 메인 parser의 단건 API 계약이 없어 먼저 parser 쪽 `POST /analyze-source` 지원이 필요했다.
  - parser와 백엔드 포트가 혼동되어 초기에는 `localhost:3000`, `13000`으로 잘못 호출했다.
  - MCP `list_metric_analyses`에 `teamProjectId` 필터를 줄 때 쿼리 문자열과 숫자 비교가 어긋나 권한 오류가 발생했다.
  - MCP 설계 초안에는 `list_api_keys`를 넣었지만, 실제 백엔드는 `GET /api/api-keys`가 JWT 보호라 API Key 기반 MCP 흐름과 맞지 않았다.
  - Codex 설정 반영 직후 새 스레드만 열었을 때는 MCP 서버가 바로 로드되지 않았고, `Developer: Reload Window`까지 필요했다.
- **해결 방법**
  - `ConfigModule`이 `.env.local`을 우선 읽도록 변경했다.
  - 로컬 MySQL 접속을 직접 확인하고 `codevi` DB를 생성했다.
  - JWT는 Swagger 응답에서 복사해 `curl`로 직접 전달하여 테스트했다.
  - parser 쪽 공용 단건 API 추가 후, 백엔드에서 `PARSER_SOURCE_URL` 또는 `PARSER_URL -> /analyze-source` 변환 규칙으로 연결했다.
  - 실제 parser 포트를 `3001`로 확인한 뒤 `.env.local`의 parser 관련 값을 수정해 재검증했다.
  - 전역 `ValidationPipe({ transform: true })`를 추가해 쿼리 DTO 숫자 변환을 활성화했다.
  - API Key 전용 MCP 흐름에 맞게 `list_api_keys` tool은 래퍼와 문서에서 제거했다.
  - `~/.codex/config.toml`에 `mcp_servers.codevi_metrics` 블록을 추가하고, `Developer: Reload Window` 후 새 Codex 스레드에서 실제 MCP 호출을 검증했다.
- **주의 사항**
  - `sourceType=ast_json` 경로는 여전히 `astData`가 필요하다.
  - `sourceType=source_code` 경로는 `sourceCode`와 `language` 또는 `filePath`가 필요하다.
  - Swagger 설정 코드는 반영했지만 UI 버튼 확인은 서버 재기동 환경에서 한 번 더 보는 것이 안전하다.
  - `source_code` 테스트는 Java 단건 예시(`Hello.java`) 기준으로 수행했다.
  - MCP Wrapper는 현재 `API Key` 기반 사용을 전제로 하며, tool은 `run_metric_analysis`, `list_metric_analyses`, `get_metric_analysis` 세 개만 유지한다.
  - 실제 Codex MCP 검증에서는 `list_metric_analyses`, `get_metric_analysis(jobId=6)`, `run_metric_analysis(source_code -> jobId=7)` 순서로 확인했다.

## 6. 다음 단계
- Swagger `Authorize` 버튼 UI 최종 확인
- MCP 클라이언트 설정 예시 다듬기 및 팀 공유
- parser 단건 API를 기준으로 언어별 테스트 케이스 확장
