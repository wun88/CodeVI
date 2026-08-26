# [Record] jej_23_reqflow_full_feature_roadmap — Phase 8

---

## 1. 작업 개요
- **일시**: 2026-08-06
- **작업자**: Claude Sonnet 5 (jej 페어)
- **대상**: `code-vi-back/src/requirements`, `code-vi-front/src/pages/ProjectDetail`

## 2. 의도 (Intent)
- **작업 동기**: 요구사항 상세 기능(버전 이력/의존관계/영향분석/상태 전이)을 구현한다. jej_20
  이후 `RequirementVersion`/`Baseline` 엔티티는 있었지만 채우는 로직·API가 없었다.
- **디자인 결정**: 상태 전이 그래프(초안→리뷰→승인/반려→폐기, 승인/반려에서 재검토 시 리뷰로
  복귀)를 신설. 승인 상태에서만 baseline 지정 허용. 의존관계는 §4 근거에 따라 그래프 시각화
  대신 텍스트 리스트+추가/삭제 폼으로 축소, `depends_on` 타입만 BFS로 순환 참조 방지(간접
  순환 포함). 신규 가드를 만들지 않고 기존 `RequirementOwnerGuard`/`ProjectMemberGuard`만
  재사용(§1.3).
- **참고 문서**: `docs/specs/jej_23_reqflow_full_feature_roadmap.md` §2 Phase 8, §1.3, §1.4

## 3. 결과 (Result)
- **주요 변경 사항**:
    - 백엔드(`fe9a4ee`): `RequirementDependency` 엔티티(FK `onDelete: CASCADE`),
      `lib/status-transitions.ts`, `RequirementsService.update()`에 상태전이 검증·baseline
      검증·자동 버전 스냅샷 추가, `RequirementDependencyService`(CRUD+순환참조 방지+영향분석),
      `GET :id/versions`, `GET/POST :id/dependencies`, `DELETE :id/dependencies/:dependencyId`,
      `GET :id/impact` 엔드포인트.
    - 프론트(`2702b4d`): `RequirementDetailModal` 신규 — 상태 전이 버튼, baseline 입력(승인
      상태에서만 활성화), 영향분석 섹션, 의존관계 추가/삭제, 버전 이력 diff 뷰.
- **검증 결과**:
    - [x] Lint 통과
    - [x] Unit Test 신규 19건(상태전이 거부/baseline 검증/버저닝 6 + 의존관계 서비스 13),
      백엔드 총 78건 통과
    - [ ] UI 시각적 정합성 확인 — 수동 확인 필요(아래 참고)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: 기존 `requirements.service.spec.ts`의 한 테스트가 DRAFT→APPROVED로 직접
  전이하고 있어 신규 상태전이 검증과 충돌 — IN_REVIEW를 경유하도록 수정. 또한 `toRequirementData`가
  `version`/`status` 기본값을 명시하지 않아 DB 컬럼 default에만 의존하고 있었는데, mock
  리포지토리는 DB 기본값을 흉내내지 않아 테스트가 실패 — 서비스 코드 자체에 기본값을
  명시적으로 채우도록 고쳐 실제 런타임 동작(재조회 전까지 undefined)과의 괴리도 함께 없앴다.
- **해결 방법**: 위 수정은 버그 은폐가 아니라 실제 로직 결함(재조회 없이 `bumpVersion`이
  undefined를 받을 수 있었던 경로)을 드러내고 고친 것.
- **다음 단계**: Phase 9(Documents) 착수.
- **수동 확인 필요**: `/projects/:id` 개요 탭에서 요구사항 클릭 → 모달에서 상태 전이 버튼,
  baseline 입력 활성화 조건, 의존관계 추가 시 순환 참조 에러 메시지, 버전 이력 diff가 실제
  브라우저에서 의도대로 동작하는지(Playwright 미도입, AGENTS.md §3.3).
