# Specification: Metric Analysis Query & Response Standard

## 1. Objective (목표)
저장된 분석 결과를 사용자와 에이전트가 일관된 형태로 재조회할 수 있도록 목록 조회, 단건 조회, 응답 표준을 정의한다. 구현 범위를 조회 API와 응답 DTO 표준화로 제한한다.

## 2. Tech Stack (기술 스택)
- **Backend**: NestJS
- **ORM**: TypeORM
- **Docs**: Swagger
- **Response Layer**: 공통 응답 인터셉터와 DTO 조합

## 3. Implementation Phases (구현 단계)

### Phase 1: 조회용 DTO 정의
- `MetricAnalysisListItemDto`
- `MetricAnalysisDetailDto`
- `MetricAnalysisSummaryDto`
- 메트릭 상세 필드는 null 가능 여부를 명확히 정의

### Phase 2: 목록 조회 API 구현
- `GET /api/analyses`
- 필터
  - `teamProjectId`
  - `analysisType`
  - `status`
- 정렬 기본값
  - 최신순
- 응답 항목
  - `jobId`
  - `status`
  - `analysisType`
  - `filePath`
  - `requestedAt`
  - `completedAt`

### Phase 3: 단건 조회 API 구현
- `GET /api/analyses/:id`
- 응답 항목
  - Job 메타데이터
  - Result 요약
  - `classic`, `ck`, `oo`, `smells` 상세
- 권한 검증
  - JWT 사용자는 본인 또는 접근 가능한 `TeamProject` 범위만 조회
  - API Key는 연결된 `TeamProject` 범위만 조회

### Phase 4: 응답 형식 표준화
- 에이전트 친화적 구조 유지
- `result.summary`, `result.classic`, `result.ck`, `result.oo`, `result.smells` 형식 고정
- 오류 응답 형식도 공통 정책에 맞춰 문서화

## 4. Acceptance Criteria (검증 기준)
- [ ] 분석 결과 목록을 필터링하여 조회할 수 있다.
- [ ] 단건 조회 시 메트릭 상세 결과를 일관된 JSON 구조로 반환한다.
- [ ] JWT와 API Key 각각에 대해 권한 범위가 올바르게 적용된다.
- [ ] Swagger에서 응답 예시가 충분히 드러난다.

## 5. Dependencies (의존성)
- [codex_11_metric_analysis_entities.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_11_metric_analysis_entities.md)
- [codex_12_metric_analysis_execution_api.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_12_metric_analysis_execution_api.md)
- 공통 응답 인터셉터 정책
