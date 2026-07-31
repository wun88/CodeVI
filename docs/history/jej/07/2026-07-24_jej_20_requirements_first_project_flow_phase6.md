# [Record] jej_20_requirements_first_project_flow — Phase 6

---

## 1. 작업 개요
- **일시**: 2026-07-24
- **작업자**: Claude (jej031020 세션)
- **대상**: `code-vi-internal/code-vi-back`(`requirements` 모듈),
  `code-vi-internal/code-vi-front`(`ProjectDetail` 페이지 확장)

## 2. 의도 (Intent)
- **작업 동기**: 원래 계획대로면 Phase 6은 코드 매핑 엔진이었지만, 착수 전 사용자와 논의해 순서를 바꿨다
  ([jej_20 spec](../../../specs/jej_20_requirements_first_project_flow.md)의 "Phase 6 설계 배경" 참고).
  ReqFlow Dashboard의 지표 중 "요구사항 개수/우선순위/AI 분석 findings"는 코드/Jenkins와 전혀 무관하게
  계산 가능한 반면, "추정 구현 점수/검증/추적성/빌드" 카드는 매핑 엔진(새 Phase 7)이 있어야 의미가 생긴다는
  걸 확인했고, 전자를 먼저 만들기로 했다 — 이 세션에서 실제 데이터로 끝까지 검증 가능한 몇 안 되는 Phase다.
- **디자인 결정**:
  - `buildAnalysisFindings` 알고리즘(ReqFlow `server/services/recompute.ts`)을 최대한 그대로 이식했다 —
    순수 텍스트 휴리스틱이라 수정 없이 옮길 수 있었고, 굳이 CodeVi 상황에 맞게 바꿀 이유가 없었다(임계값
    0.55, 키워드 조합 등 원본 그대로 유지).
  - Findings 저장 정책도 ReqFlow와 동일하게 "재계산 시 기존 findings 전체 교체"로 했다 — 이력을 남기지
    않는 단순한 정책이지만, ReqFlow도 그랬고 지금 단계에서 이력 추적까지 필요하다고 보지 않았다.
  - **새 라우트를 만들지 않고 Phase 5의 `/projects/:teamProjectId`(프로젝트 상세)를 확장**했다 — 대시보드가
    보여줄 데이터(요구사항 개수, findings)가 이미 그 화면에 있는 데이터와 겹치므로, 별도 `/dashboard`
    라우트를 만들면 오히려 같은 데이터를 두 화면에서 따로 불러오게 된다.
  - **구현완료/부분/미구현 분포, 추적성 링크, 최신 빌드 카드는 의도적으로 만들지 않았다.**
    `implementationScore`가 아직 전부 0이라 지금 만들면 "전부 미구현"만 나와 오해를 준다 — Phase 7(매핑
    엔진) 완료 후에 채우기로 spec에 명시했다.
  - **`GET/POST /requirements/:teamProjectId/...` 두 엔드포인트에 프로젝트 멤버십 검증을 추가**했다. Phase 2에서
    만든 기존 `POST/GET /requirements`(`create`, `findAll`)에는 이 검증이 없다는 걸 재확인했는데, Phase 5에서
    세운 "새로 만드는 프로젝트 스코프 엔드포인트는 멤버십 검증이 필수"라는 원칙을 이번에도 따랐다. Phase 2
    엔드포인트 자체를 고치는 건 이번 스펙 범위 밖이라 손대지 않았고, 알려진 격차로 이 기록에 남긴다 — 다음에
    `requirements` 모듈을 다시 만질 일이 있으면 함께 고려할 것.
  - 순환 참조를 피하려고 `RequirementsModule`이 `TeamProjectModule`을 import하는 대신 `TeamProject`
    엔티티만 `TypeOrmModule.forFeature`에 등록해 리포지토리만 주입받았다(`TeamProjectModule`이 이미 Phase 3부터
    `RequirementsModule`을 import하고 있어, 반대 방향으로 모듈을 import하면 순환 참조가 생긴다).
- **참고 문서**: [jej_20_requirements_first_project_flow.md](../../../specs/jej_20_requirements_first_project_flow.md)
  ("Phase 6 설계 배경" 섹션), `C:/requirements-management-system/server/services/recompute.ts`,
  `C:/requirements-management-system/src/utils/requirement.ts`(마감일 긴급도 로직),
  `C:/requirements-management-system/src/components/dashboard/*.tsx`(카드 구성 참고)

## 3. 결과 (Result)
- **주요 변경 사항**:
  - **Backend**
    - `code-vi-internal/code-vi-back/src/requirements/lib/analysis-engine.ts`(신규):
      `buildAnalysisFindings` 이식 — 순수 함수, DB 접근 없음.
    - `code-vi-internal/code-vi-back/src/requirements/lib/due-date.ts`(신규): ReqFlow
      `getDueDateUrgency`/`getDueInDays` 이식.
    - `code-vi-internal/code-vi-back/src/requirements/dto/requirements-summary.dto.ts`(신규):
      `RequirementsSummaryDto` 등 응답 타입.
    - `code-vi-internal/code-vi-back/src/requirements/requirements.service.ts`:
      `recomputeFindings(userId, teamProjectId)`, `getSummary(userId, teamProjectId)`,
      `assertMembership()` 추가. `AnalysisFinding`/`TeamProject` 리포지토리 주입 추가.
    - `code-vi-internal/code-vi-back/src/requirements/requirements.controller.ts`:
      `POST /requirements/:teamProjectId/analysis/recompute`,
      `GET /requirements/:teamProjectId/summary` 추가(둘 다 JWT + 멤버십 검증).
    - `code-vi-internal/code-vi-back/src/requirements/requirements.module.ts`: `TeamProject` 엔티티
      등록 추가.
    - `code-vi-internal/code-vi-back/src/requirements/requirements.service.spec.ts`: 멤버십 403,
      중복 finding 생성, 재계산 시 findings 교체, 집계(개수/우선순위/마감알림/분석요약) 정확성 — 4건 추가.
  - **Frontend**
    - `code-vi-internal/code-vi-front/src/interface/requirement.interface.ts`: `AnalysisFinding`,
      `DueDateAlert`, `RequirementsSummary` 타입 추가.
    - `code-vi-internal/code-vi-front/src/services/requirementsService.ts`: `getSummary()`,
      `recomputeAnalysis()` 추가.
    - `code-vi-internal/code-vi-front/src/pages/ProjectDetail/ProjectDetail.tsx`,
      `ProjectDetail.module.css`: KPI 카드 로우(전체/우선순위/findings/마감알림), AI 분석 카드("AI 분석
      실행" 버튼 포함), 마감 임박/지연 위젯 추가.
- **검증 결과**:
    - [x] Lint 통과 (Backend/Frontend 모두)
    - [x] Unit Test 합계 — Backend 25/25 pass(신규 4건)
    - [x] `cd code-vi-back && npm run build` / `npm test` 통과
    - [x] `cd code-vi-front && npx tsc -b` / `npm run build` 통과
    - [x] `/verify` 스탬프 발급 (front + back)
    - [x] [부분 수동 확인] `/projects/1`에서 3개 API(`GET /api/team-projects/1`,
      `GET /api/requirements?teamProjectId=1`, `GET /api/requirements/1/summary`)가 정확한 경로로
      호출되고, 백엔드 부재(502) 시 화면이 깨지지 않고 에러 문구를 보여주는 것까지 확인. 콘솔 에러 없음.
    - [ ] 실제 데이터(요구사항 여러 건 + 중복 후보 포함)가 채워진 화면에서 KPI/AI 분석/마감 위젯이 정확히
      보이는지 — **미확인**(4번 항목 참고, 실제 DB 연결 환경 필요)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**:
  - 이 Phase는 spec에 "외부 인프라 의존 없이 이 세션에서 실제 데이터로 끝까지 검증 가능"이라고 적어뒀는데,
    실제로 시도해보니 **로컬 MySQL 자체는 있었다**(Windows 서비스 `MySQL80`, 포트 3306) — 다만 이 프로젝트가
    쓰도록 설정된 DB는 `.env`상 포트 **13306**(docker-compose 전용)이었고, 이 포트는 응답이 없었다(Docker
    Desktop 데몬이 꺼져 있음). Docker 데몬을 직접 켜는 것은 시스템 상태를 크게 바꾸는 일이라 이 Phase
    범위를 넘는다고 판단해 하지 않았고, 대신 기존 방식(단위 테스트 + 브라우저로 API 경로/에러 처리 확인)을
    유지했다. "로직 자체는 검증 가능"이라는 spec의 주장은 유닛 테스트로 충족했지만, "실제 화면에 실제
    데이터가 나오는지"는 여전히 실제 DB 환경이 필요하다 — 이 구분을 spec/history에 명확히 남겼다.
  - `RequirementsService`에 `TeamProject` 리포지토리를 추가하면서 `RequirementsModule`이
    `TeamProjectModule`을 import하고 싶었지만, `TeamProjectModule`이 이미 Phase 3부터
    `RequirementsModule`을 import하고 있어 순환 참조가 생겼다. 엔티티만 `TypeOrmModule.forFeature`에
    등록하는 방식(모듈이 아니라 엔티티만 공유)으로 우회했다 — Phase 5에서 이미 같은 패턴을 썼던 것과 동일.
- **해결 방법**: 위 내용대로 검증 범위를 정직하게 구분해 기록, 순환 참조는 엔티티 단위 공유로 우회.
- **다음 단계**: jej_20 Phase 7(실제 `AstFile`/`AstClass`/`AstFunction` 데이터 기반 요구사항-코드 매핑
  엔진 + "N개 중 M개 매핑됨" 확인 화면)으로 진행. Phase 7은 실제 Jenkins/GitHub 파이프라인이 있는 환경이
  아니면 이 세션에서 끝까지 재현할 수 없다는 점이 spec에 이미 명시되어 있다.
