# [Record] jej_23_reqflow_full_feature_roadmap — Phase 7

---

## 1. 작업 개요
- **일시**: 2026-08-05
- **작업자**: Claude Sonnet 5 (jej 페어)
- **대상**: `code-vi-back/src/requirements`, `code-vi-back/src/ast-relational`, `code-vi-front/src/pages/ProjectDetail`

## 2. 의도 (Intent)
- **작업 동기**: jej_20이 "Phase 7, 후순위"로 미뤄둔 요구사항-코드 자동 매핑 엔진을 구현한다.
  요구사항의 `implementationScore` 컬럼은 이미 있었지만 채우는 로직이 없었다.
- **디자인 결정**: ReqFlow 원본의 `overlapScore` 토큰 오버랩 알고리즘을 그대로 이식하되,
  비교 대상을 ReqFlow의 목업 코드가 아니라 CodeVi가 이미 수집해 둔 실제 `AstSnapshot`
  (파일/클래스/함수)으로 교체했다. 그래프 시각화(RelationshipGraph)와 코드 스니펫 패널은
  1차 이식에서 제외(§4 근거) — 실사용 데이터로 가치가 검증된 뒤 후속 검토.
- **참고 문서**: `docs/specs/jej_23_reqflow_full_feature_roadmap.md` §2 Phase 7

## 3. 결과 (Result)
- **주요 변경 사항** (커밋 `4ac0e1b`):
    - `code-mapping-engine.ts`: 순수 함수 `computeRequirementMapping`/`getMappingStatus` —
      top-5 유사도 평균×60% + 수용기준 충족도×40% = `implementationScore`.
    - `code-mapping.service.ts`: `recomputeForTeamProject`(최신 AstSnapshot 평탄화 → 매핑
      → `Requirement.implementationScore`/`ValidationDetail`/`TraceabilityRecord` 갱신),
      `getMappingSummary`.
    - `ast-relational.service.ts::saveAstData()`에 fire-and-forget 재계산 트리거 추가.
    - `GET/POST :teamProjectId/mapping-summary`, `mapping/recompute` 엔드포인트.
    - 프론트: 매핑 요약 배너, 상태/점수 필터, 요구사항별 점수 배지 + 유사도/매칭/누락 통계.
- **검증 결과**:
    - [x] Lint 통과
    - [x] Unit Test 10건 신규 (총 59건 통과)
    - [ ] UI 시각적 정합성 확인 — 수동 확인 필요(아래 참고)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: 테스트 작성 중 한국어 요구사항 설명과 영어 camelCase 코드 식별자가 토큰
  오버랩으로 매칭되지 않는 것을 "버그"로 오인했다 — 실제로는 알고리즘이 정확했고(다른 문자
  체계는 겹치지 않는 게 맞음) 테스트 시나리오가 비현실적이었다. 요구사항 텍스트에 영어 단어를
  섞어 넣어 수정.
- **해결 방법**: `ast-relational.service.ts`를 건드리며 사전에 있던 lint 부채(40건, `manager: any`
  등)가 훅에 의해 표면화돼 함께 정리했다(주입된 오류는 그 자리에서 수정하는 리포 정책).
- **다음 단계**: Phase 8(요구사항 상세 기능 확장) 착수.
- **수동 확인 필요**: `/projects/:id` 개요 탭에서 "요구사항-코드 매핑" 카드의 배너/재검증 버튼과
  요구사항 목록의 점수 배지·필터가 실제 AST 데이터 기준으로 올바르게 표시되는지 — 실제
  Jenkins/GitHub 연동 환경이 필요하다(Playwright 미도입, AGENTS.md §3.3).
