# Metrics API Work Index

## 1. 작업 개요
- **일시**: 2026-06
- **작업자**: byoon (agent)
- **대상**: Metrics API Service MVP

## 2. 목적
- 품질 메트릭 분석 기능을 사용자와 에이전트가 공통으로 사용할 수 있는 백엔드 API 형태로 정리한다.
- `API Key`, `분석 실행`, `분석 조회`, `테스트 샘플`까지의 흐름을 명세와 코드 기준으로 연결한다.

## 3. 작업 순서
1. [codex_08_metrics_api_mvp.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_08_metrics_api_mvp.md)
2. [codex_09_metrics_api_schema_contract.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_09_metrics_api_schema_contract.md)
3. [codex_10_api_key_management.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_10_api_key_management.md)
4. [codex_11_metric_analysis_entities.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_11_metric_analysis_entities.md)
5. [codex_12_metric_analysis_execution_api.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_12_metric_analysis_execution_api.md)
6. [codex_13_metric_analysis_query_api.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_13_metric_analysis_query_api.md)
7. [codex_14_metrics_api_test_samples.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_14_metrics_api_test_samples.md)

## 4. 현재 구현 범위
- `API Key` 엔티티, 서비스, 컨트롤러, 인증 Guard 구현
- `MetricAnalysisJob`, `MetricAnalysisResult` 엔티티 구현
- `POST /api/analyses` 실행 API 구현
- `GET /api/analyses`, `GET /api/analyses/:id` 조회 API 구현
- 테스트용 요청/응답 샘플 문서 작성

## 5. 비고
- `docs/specs`를 단일 원본으로 유지하고, 이 폴더는 작업 흐름 인덱스와 기록 요약만 담당한다.
- 중복 spec 복사본은 유지하지 않는다.

## 6. 기록
- [2026-06-04_metrics_api_mvp_progress.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/history/byoon/06(agent)/2026-06-04_metrics_api_mvp_progress.md)
