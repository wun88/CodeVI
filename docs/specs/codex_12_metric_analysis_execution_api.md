# Specification: Metric Analysis Execution API

## 1. Objective (목표)
사용자 또는 에이전트가 코드 품질 메트릭 분석을 실제로 요청할 수 있도록 실행 API를 정의한다. 기존 `MetricService`를 재사용하고, 입력 검증과 권한 검사를 포함한 단일 분석 진입점을 제공한다.

## 2. Tech Stack (기술 스택)
- **Backend**: NestJS
- **Auth**: JWT Guard, API Key Guard
- **Validation**: `class-validator`, `class-transformer`
- **Metrics Engine**: 기존 `MetricService`

## 3. Implementation Phases (구현 단계)

### Phase 1: 요청 DTO 정의
- `CreateMetricAnalysisRequestDto`
- 필수 필드
  - `teamProjectId`
  - `analysisType`
  - `sourceType`
- 조건부 필드
  - `filePath`
  - `sourceCode`
  - `astData`
- 검증 규칙
  - `sourceType=source_code`이면 `sourceCode` 필수
  - `sourceType=ast_json`이면 `astData` 필수
  - `analysisType`은 허용 enum만 수락

### Phase 2: 인증 주체 통합 처리
- JWT 사용자 요청 허용
- API Key 요청 허용
- 둘 중 하나만 통과하면 분석 가능
- 요청 주체를 `requestedByUser` 또는 `apiKey`로 Job에 기록

### Phase 3: 분석 실행 서비스 구현
- `MetricAnalysisService`에서 흐름 관리
  - 권한 확인
  - Job 생성
  - `MetricService` 호출
  - 결과 저장
  - 성공/실패 상태 반영
- MVP는 동기 처리로 구현
- 실패 시 `FAILED` 상태와 오류 메시지 저장

### Phase 4: 실행 엔드포인트 노출
- `POST /api/analyses`
- 반환 항목
  - `jobId`
  - `status`
  - `teamProjectId`
  - `analysisType`
  - `result`
- 내부 `metrics/*` 컨트롤러와 중복되는 외부 공개 경로는 최소화하고, 외부 사용은 이 엔드포인트를 우선 사용

## 4. Acceptance Criteria (검증 기준)
- [ ] JWT 또는 API Key 둘 중 하나로 `POST /api/analyses` 호출이 가능하다.
- [ ] 입력 조건 위반 시 적절한 `400` 오류가 반환된다.
- [ ] `MetricService` 계산 결과가 Job/Result 저장 구조와 함께 응답된다.
- [ ] 권한 없는 `TeamProject`에 대한 요청은 거부된다.
- [ ] 실패 요청도 이력으로 남는다.

## 5. Dependencies (의존성)
- [codex_10_api_key_management.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_10_api_key_management.md)
- [codex_11_metric_analysis_entities.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_11_metric_analysis_entities.md)
- 기존 `metric.service.ts`
- 기존 `team-project` 접근 정책
