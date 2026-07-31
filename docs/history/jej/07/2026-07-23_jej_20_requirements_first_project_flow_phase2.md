# [Record] jej_20_requirements_first_project_flow — Phase 2

---

## 1. 작업 개요
- **일시**: 2026-07-23
- **작업자**: Claude (jej031020 세션)
- **대상**: `code-vi-internal/code-vi-back` — 신규 `requirements` 모듈

## 2. 의도 (Intent)
- **작업 동기**: [jej_20 spec](../../../specs/jej_20_requirements_first_project_flow.md) Phase 2 —
  ReqFlow(`C:/requirements-management-system`)의 `prisma/schema.prisma`에 정의된 요구사항 도메인
  (`Requirement`, `RequirementVersion`, `Baseline`, `AnalysisFinding`, `ValidationDetail`,
  `TraceabilityRecord`)을 CodeVi의 TypeORM/MySQL로 이식한다. Phase 1에서 만든 "코드 없이 생성 가능한
  TeamProject"에 요구사항을 붙일 수 있어야 다음 Phase(요구사항 입력 화면)가 가능해진다.
- **디자인 결정**:
  - 모든 FK를 ReqFlow의 `projectId: string`(자체 `Project` 모델) 대신 `teamProjectId: number`
    (→ CodeVi `TeamProject`)로 교체 — jej_20 1.1의 Option A(정본을 TeamProject로 통일)를 따름.
  - 엔티티 스타일은 가장 최근에 추가된 `metric-analysis` 모듈(`entities/*.enum.ts` 분리,
    `@Index() @Column() teamProjectId` + `@ManyToOne(...) @JoinColumn` 패턴, `CommonEntity` 상속)을
    그대로 따랐다 — 새 컨벤션을 만들지 않음.
  - `owner`(요구사항 담당자)/`changedBy`(버전 변경자)를 ReqFlow처럼 자유 문자열로 두지 않고 실제 CodeVi
    `User`에 대한 nullable FK(`ownerId`/`changedById`)로 설계했다 — `TeamProject.users`(팀원)가 이미
    실존하는 개념이므로 이를 재사용하는 편이 별도의 가짜 사용자 목록을 다시 만드는 것보다 낫다고 판단.
  - `ValidationDetail`/`TraceabilityRecord`는 ReqFlow 원본처럼 `requirementId`를 그대로 PK로 쓰지 않고
    `CommonEntity`(자체 `id`) + `requirementId`(unique FK)로 통일 — 이 저장소의 모든 엔티티가
    `CommonEntity`를 상속하는 기존 관례를 깨지 않기 위함.
  - `AnalysisFinding`에는 ReqFlow 원본에 없던 `teamProjectId` 컬럼을 추가했다 — ReqFlow는 findings를
    프로젝트 스코프 없이 전역으로 저장했는데, "내 프로젝트별로 분석 findings를 보여준다"는 목표상 조회
    편의를 위해 필요하다고 판단(스펙에도 근거를 남김).
  - Phase 2 완료 조건이 요구하는 것은 `Requirement`의 CRUD(POST/GET)뿐이므로, 나머지 5개 엔티티는
    스키마만 마련하고(향후 Phase 5용) 컨트롤러/서비스는 아직 만들지 않았다 — 필요 이상으로 앞서가지 않음.
- **참고 문서**: [jej_20_requirements_first_project_flow.md](../../../specs/jej_20_requirements_first_project_flow.md),
  `C:/requirements-management-system/prisma/schema.prisma`,
  `code-vi-internal/code-vi-back/src/metric-analysis/`(패턴 참고)

## 3. 결과 (Result)
- **주요 변경 사항**:
  - `code-vi-internal/code-vi-back/src/requirements/entities/`: `requirement.entity.ts`,
    `requirement-version.entity.ts`, `baseline.entity.ts`, `analysis-finding.entity.ts`,
    `validation-detail.entity.ts`, `traceability-record.entity.ts`(신규) + enum 5개
    (`requirement-type`, `requirement-priority`, `requirement-status`, `analysis-finding-type`,
    `analysis-severity`).
  - `code-vi-internal/code-vi-back/src/requirements/dto/create-requirement.dto.ts`,
    `query-requirement.dto.ts`(신규): class-validator 검증.
  - `code-vi-internal/code-vi-back/src/requirements/requirements.service.ts`(신규):
    `create()`, `findByTeamProject()`.
  - `code-vi-internal/code-vi-back/src/requirements/requirements.controller.ts`(신규):
    `POST /api/requirements`, `GET /api/requirements?teamProjectId=`(둘 다 JWT 인증 필요).
  - `code-vi-internal/code-vi-back/src/requirements/requirements.module.ts`(신규),
    `src/app.module.ts`에 등록.
  - `code-vi-internal/code-vi-back/src/requirements/requirements.service.spec.ts`(신규): 기본값 채우기,
    `teamProjectId` 필터링 검증. `team-project.service.spec.ts`와 동일하게 `team-project.entity.ts`를
    `jest.mock`으로 대체(사유는 4번 항목 참고).
- **검증 결과**:
    - [x] Lint 통과
    - [x] Unit Test 합계 (13/13 pass — 신규 2건 포함)
    - [x] `npm run build` 통과
    - [x] `/verify` 스탬프 발급 (`code-vi-internal/code-vi-back`)
    - [ ] 실제 MySQL에서 `synchronize: true`로 신규 테이블이 의도대로 생성되는지 — **미확인**(4번 항목 참고,
      spec 4장에 `[수동 확인]`으로 남김)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**:
  - Phase 2 AC 중 "서버 기동 시 신규 테이블 자동 생성 확인"을 이 샌드박스에서 재현하려고 두 가지를
    시도했다: (1) `USE_SQLITE=true npm run start`로 실제 Nest 앱을 띄우는 방법 — 출력 없이 조용히
    종료되어 원인 파악이 어려웠다. (2) 원인을 좁히기 위해 TypeORM `DataSource`만 단독으로 띄우는
    스크립트(`scratch-sync-check.ts`, 커밋되지 않은 임시 파일)로 재현했더니
    `DataTypeNotSupportedError: Data type "timestamp" ... is not supported by "sqlite"`가
    `CodeAnalysis.createdAt`(즉 모든 엔티티가 상속하는 `CommonEntity`)에서 발생했다 — **이 저장소의
    sqlite 모드 자체가 기존 엔티티 전체에 대해 이미 깨져 있는 상태**이며, 이번 Phase 2 변경과 무관한
    pre-existing 환경 한계임을 확인했다. 스크립트는 확인 직후 삭제했다(레포에 남기지 않음).
  - 이 사실 때문에 "실제 서버 기동 → 자동 테이블 생성"은 이 샌드박스에서 검증할 방법이 없다고 판단,
    Phase 1과 동일하게 리포지토리를 목킹한 서비스 단위 테스트로 대체하고 spec/history에 그 사실과 근거를
    명시적으로 남겼다(AGENTS.md 3.3 "정직한 공백" 원칙 — 안 되는 검증을 되는 것처럼 기록하지 않음).
  - `requirements.service.spec.ts` 작성 시 `Requirement` 엔티티를 실제로 import하자
    `team-project.entity.ts` → `ast-relational` 엔티티 체인에서 동일한 jest 모듈 해석 실패(Phase 1의
    `astId`/`src/...` 절대경로 이슈와 같은 뿌리)가 재발해, `team-project.service.spec.ts`와 동일한
    `jest.mock` 우회를 다시 적용했다.
- **해결 방법**: 위 내용대로 대체 검증 경로 사용, 임시 스크립트 즉시 삭제, 기존 mocking 컨벤션 재사용.
- **다음 단계**:
  1. (권장, 이 spec 범위 밖) 실제 `codevi` MySQL이 연결된 환경에서 서버를 한 번 기동해 6개 신규 테이블이
     정상 생성되는지 사람이 직접 확인.
  2. jej_20 Phase 3(`GET /api/team-projects/mine` + `/projects` "내 프로젝트" 목록 페이지)으로 진행.
