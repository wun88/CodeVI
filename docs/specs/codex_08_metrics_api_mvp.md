# Specification: Metrics API Service MVP

## 1. Objective (목표)
사용자와 에이전트가 공통으로 사용할 수 있는 코드 품질 메트릭 분석 서비스를 MVP 범위로 정의한다. 기존 `metric`, `ast-relational`, `code-analysis` 모듈을 훼손하지 않고, 인증 가능한 API 형태로 외부 호출이 가능하도록 백엔드 구조를 정리한다.

## 2. Tech Stack (기술 스택)
- **Backend**: NestJS, TypeORM, MySQL
- **Auth**: JWT (사용자 세션), API Key (에이전트/외부 호출)
- **Documentation**: Swagger (`/api`)
- **Data Model**: 기존 `users` 모듈 확장 + 분석 이력 및 API 키 관리용 Entity 추가
- **Integration Target**: 향후 MCP 서버 또는 외부 Agent Adapter가 호출할 수 있는 REST API

## 3. MVP Scope (범위)
- 사용자 회원 식별 및 API Key 발급
- 프로젝트 단위의 분석 요청 생성
- AST/소스 입력 기반 메트릭 계산
- 분석 결과 저장 및 단건/목록 조회
- 에이전트가 호출 가능한 JSON 응답 규격 제공

## 4. Implementation Phases (구현 단계)

### Phase 1: 사용자 및 API Key 관리 모델 정리
- 기존 `users` 모듈을 기준으로 API 호출 주체를 식별할 수 있는 정책 정의
- `api_keys` 또는 동등한 저장 모델 설계
- API 키 원문은 1회만 발급하고, DB에는 해시만 저장하는 구조 반영
- 사용자별 활성/폐기 상태 관리 필드 정의

### Phase 2: 프로젝트 및 분석 요청 MVP 모델 구축
- 사용자 소유의 `project` 개념 정의
- `analysis_jobs` 또는 동등한 분석 요청 엔티티 설계
- 입력 데이터 범위를 MVP 기준으로 제한
  - `filePath`
  - `sourceCode` 또는 `astData`
  - 분석 타입(`classic`, `ck`, `oo`, `smells`, `full`)
- 초기 버전은 동기 처리 우선, 장기적으로 비동기 전환 가능한 구조 유지

### Phase 3: REST API 엔드포인트 노출
- 사용자용 인증 엔드포인트 정리
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
- API Key 관리 엔드포인트 추가
  - `POST /api/api-keys`
  - `GET /api/api-keys`
  - `DELETE /api/api-keys/:id`
- 프로젝트 및 분석 엔드포인트 추가
  - `POST /api/projects`
  - `GET /api/projects`
  - `POST /api/analyses`
  - `GET /api/analyses`
  - `GET /api/analyses/:id`
- 기존 `metrics` 모듈은 내부 계산 엔진으로 재사용하고, 외부 공개용 엔드포인트 규격은 분석 요청 흐름에 맞게 정리

### Phase 4: 결과 저장 및 응답 규격 표준화
- 분석 결과의 저장 범위를 정의
  - 요청 메타데이터
  - 계산된 메트릭 요약
  - 클래스별/파일별 상세 결과
- 응답 JSON 형식을 에이전트 친화적으로 표준화
- 실패 응답 시 인증 실패, 입력 오류, 분석 실패를 구분 가능한 코드로 반환

### Phase 5: 향후 Agent 연동 대비 인터페이스 고정
- 향후 MCP 서버가 쉽게 감쌀 수 있도록 요청/응답 계약 고정
- 사용자 설정 JSON에서 필요한 연결 정보 정의
  - `baseUrl`
  - `apiKey`
  - `projectId`
  - `enabledMetrics`
- 로컬 도구, 사내 에이전트, 외부 에이전트가 동일 계약으로 호출 가능하도록 문서화

## 5. Acceptance Criteria (검증 기준)
- [ ] 사용자가 로그인 후 API Key를 발급받고, 동일 키로 보호된 분석 API 호출이 가능하다.
- [ ] `POST /api/analyses` 호출 시 기존 `metric` 계산 로직을 재사용하여 메트릭 결과 JSON이 반환된다.
- [ ] 분석 요청 및 결과가 프로젝트 단위로 저장되고, 목록 및 단건 조회가 가능하다.
- [ ] API Key는 DB에 평문으로 저장되지 않는다.
- [ ] Swagger에서 MVP 엔드포인트와 요청/응답 DTO를 확인할 수 있다.
- [ ] 향후 MCP 래퍼가 별도 변환 없이 사용할 수 있을 정도로 응답 구조가 일관된다.

## 6. Dependencies (의존성)
- 기존 `users`, `auth`, `metric`, `code-analysis` 모듈 구조에 의존한다.
- TypeORM 기반 엔티티 및 마이그레이션 전략 정리가 선행되어야 한다.
- 사용자/프로젝트 권한 정책은 현재 서비스의 인증 모델과 충돌하지 않아야 한다.
- 향후 Notion 또는 MCP 등록 문서와 연결될 수 있도록 API 계약 문서화가 필요하다.

## 7. Out of Scope (MVP 제외 범위)
- 과금 및 정산 시스템
- 복잡한 팀/조직 단위 권한 관리
- 대용량 저장소 비동기 큐 처리
- 외부 Git 연동 자동 분석 파이프라인
- 공개 마켓플레이스 배포 및 멀티테넌트 운영 자동화
