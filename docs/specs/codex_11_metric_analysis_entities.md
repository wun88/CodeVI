# Specification: Metric Analysis Job & Result Entities

## 1. Objective (목표)
메트릭 분석 요청과 결과를 프로젝트 단위로 저장하기 위해 분석 Job 및 Result 엔티티를 정의한다. MVP에서는 빠른 구현과 재조회 가능성을 우선하며, 기존 `MetricService`를 감싸는 기록 계층을 제공한다.

## 2. Tech Stack (기술 스택)
- **Backend**: NestJS, TypeORM
- **Database**: MySQL
- **Serialization**: JSON 컬럼 또는 직렬화 가능한 텍스트 컬럼

## 3. Implementation Phases (구현 단계)

### Phase 1: 상태 및 타입 enum 정의
- `MetricAnalysisStatus`
  - `PENDING`
  - `SUCCESS`
  - `FAILED`
- `MetricAnalysisType`
  - `classic`
  - `ck`
  - `oo`
  - `smells`
  - `full`
- `MetricSourceType`
  - `source_code`
  - `ast_json`

### Phase 2: `MetricAnalysisJob` 엔티티 정의
- 필수 필드
  - `id`
  - `status`
  - `analysisType`
  - `sourceType`
  - `filePath`
  - `errorMessage`
  - `completedAt`
- 관계 정의
  - `ManyToOne(User, nullable=true)` as `requestedByUser`
  - `ManyToOne(ApiKey, nullable=true)`
  - `ManyToOne(TeamProject)`

### Phase 3: `MetricAnalysisResult` 엔티티 정의
- 필수 필드
  - `id`
  - `summaryJson`
  - `classicJson`
  - `ckJson`
  - `ooJson`
  - `smellsJson`
- 관계 정의
  - `OneToOne(MetricAnalysisJob)`

### Phase 4: 저장 정책 고정
- 원본 `sourceCode`와 전체 `astData`는 기본적으로 DB에 저장하지 않음
- 저장 대상은 요청 메타데이터와 계산 결과로 제한
- 실패 요청은 `Job` 레벨에서 상태와 오류 메시지까지 남김
- 추후 디버깅 저장 기능 추가 가능하도록 확장 여지 확보

## 4. Acceptance Criteria (검증 기준)
- [ ] `TeamProject` 기준으로 분석 Job을 생성할 수 있다.
- [ ] `SUCCESS` 결과는 `MetricAnalysisResult`와 연결된다.
- [ ] `FAILED` 결과도 오류 메시지와 함께 이력에 남는다.
- [ ] 기존 `User`, `TeamProject` 관계와 충돌하지 않는다.
- [ ] 분석 상세 결과를 JSON 중심으로 재조회할 수 있다.

## 5. Dependencies (의존성)
- [codex_10_api_key_management.md](/Users/jeonbyeong-yoon/Desktop/무제 폴더/종합설계 관련/종합설계 프로젝트/CodeVi/docs/specs/codex_10_api_key_management.md)
- 기존 `team-project` 엔티티
- 기존 `users` 엔티티
- `metric` 계산 결과 DTO 구조
