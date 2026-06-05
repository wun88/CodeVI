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
- **주요 코드 변경**
  - `src/api-key/`: `ApiKey` 엔티티, 서비스, 컨트롤러, Guard, DTO 구현
  - `src/metric-analysis/`: `MetricAnalysisJob`, `MetricAnalysisResult`, 실행/조회 API, 복합 인증 Guard 구현
  - [app.module.ts](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/src/app.module.ts): `.env.local` 우선 로딩 및 모듈 등록
  - [metric.module.ts](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/src/metric/metric.module.ts): `MetricService` export
  - [README.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/README.md): 로컬 테스트용 env 설명 추가
  - [.env.local.example](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/code-vi-internal/code-vi-back/.env.local.example): 로컬 테스트용 예시 파일 추가

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
- **검증 요약**
  - [x] `API Key` 발급/조회 흐름 검증 완료
  - [x] JWT 경로 `Metric Analysis` 실행/목록/상세 조회 흐름 검증 완료
  - [x] API Key 경로 `Metric Analysis` 실행/목록/상세 조회 흐름 검증 완료
  - [x] 현재 MVP 범위(`codex_10`~`codex_14`) 수동 검증 완료

## 5. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**
  - 기존 `.env`가 도커 네트워크 기준이라 로컬에서 `codevi-db`를 찾지 못했다.
  - 로컬 MySQL은 `127.0.0.1:3306`에서 동작했지만 초기 `.env.local` 값이 `13306`, `refactory` 기준으로 남아 있었다.
  - Swagger 전역 보안 스키마가 없어 `Authorize` 버튼이 보이지 않았다.
- **해결 방법**
  - `ConfigModule`이 `.env.local`을 우선 읽도록 변경했다.
  - 로컬 MySQL 접속을 직접 확인하고 `codevi` DB를 생성했다.
  - JWT는 Swagger 응답에서 복사해 `curl`로 직접 전달하여 테스트했다.
- **주의 사항**
  - 현재 `POST /api/analyses`는 `teamProjectId`와 `astData`가 필요하다.
  - Swagger에서 전역 `Authorize` 버튼은 아직 없어서 JWT/API Key 보호 API는 `curl`로 검증했다.
  - 현재 테스트는 최소 AST payload(`type: "program", children: []`) 기준으로 수행했다.

## 6. 다음 단계
- Swagger `Authorize` 버튼 추가분 서버 재기동 후 UI 확인
- `sourceCode -> parser -> astData` 자동 연결 여부 결정
- 에이전트 사용을 위한 MCP 래퍼 또는 API 호출 어댑터 설계
