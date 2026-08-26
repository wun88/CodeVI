# [Record] jej_23_reqflow_full_feature_roadmap — Phase 10

---

## 1. 작업 개요
- **일시**: 2026-08-06
- **작업자**: Claude Sonnet 5 (jej 페어)
- **대상**: `code-vi-back/src/requirements`, `code-vi-back/src/users`, `code-vi-front/src/pages/ProjectDetail`

## 2. 의도 (Intent)
- **작업 동기**: 빌드 이력 화면을 실제 Jenkins 데이터로 구현한다. ReqFlow 원본의 "빌드
  시뮬레이션"·커밋메시지 정규식 매핑(`REQ-\d{3}`)은 이식하지 않는다(§4 근거, jej_20에서도
  이미 경고됨) — CodeVi는 실제 Jenkins/GitHub 연동이 있으므로 가짜 빌드를 섞을 이유가 없다.
- **디자인 결정**: `ImplementationScoreSnapshot` 엔티티 신설 — Phase 7의
  `recomputeForTeamProject` 실행마다 요구사항별 점수를 buildNumber와 함께 남긴다.
  `BuildHistoryService`가 실제 Jenkins 빌드(`CodeAnalysis`)와 이 스냅샷을 조인해 빌드
  이력/상세/타임라인을 제공.
- **참고 문서**: `docs/specs/jej_23_reqflow_full_feature_roadmap.md` §2 Phase 10

## 3. 결과 (Result)
- **주요 변경 사항**:
    - 백엔드(`fcbee9b`): `ImplementationScoreSnapshot` 엔티티, `CodeMappingService`에
      buildNumber 파라미터 추가, `BuildHistoryService`(build-history/build-detail/
      score-timeline), `GET :teamProjectId/build-history[/:buildNumber]`,
      `GET :teamProjectId/score-timeline`.
    - **버그 발견/수정**: 실제 Jenkins 빌드 리포트를 받는 유일한 경로
      (`users.service.ts::createBuildReport`)가 지금까지 `CodeMappingService.
      recomputeForTeamProject`를 전혀 호출하지 않고 있었다 — Phase 7 자동 트리거는
      `ast-relational.service.ts::saveAstData()`(별도 테스트/수동 경로)에만 연결돼 있었고,
      실제 프로덕션 빌드 흐름은 이를 우회하고 있었다. fire-and-forget 트리거를 추가해 실제
      빌드마다 Phase 7/10이 함께 동작하도록 수정.
    - `users.service.ts`를 건드리며 표면화된 기존 lint 부채 43건(unsafe any 다수, 불필요한
      try/catch, 부정확한 에러 캐치 등) 정리, `@types/bcrypt` devDependency 추가.
    - 프론트(`18e3147`): "빌드 이력" 탭 — 요약 카드, 빌드 테이블, 빌드 상세 패널.
- **검증 결과**:
    - [x] Lint 통과
    - [x] Unit Test 신규 16건(BuildHistoryService 8 + CodeMappingService 확장 2 등),
      백엔드 총 105건 통과
    - [ ] UI 시각적 정합성 확인 — 수동 확인 필요(아래 참고)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: 위 "버그 발견" 항목 — Phase 7 작업 시점에는 자동 트리거가 붙어있다고
  스펙에 적었지만, 실제 프로덕션 경로(`createBuildReport`)가 아닌 별도 경로에만 연결돼
  있었다는 걸 Phase 10 착수 전 사실 확인 과정에서 발견했다. AGENTS.md의 "사실 확인" 요구가
  실제로 버그를 잡아낸 사례.
- **해결 방법**: `UsersModule`이 `RequirementsModule`을 import하도록 추가(순환 참조 없음
  확인 후), `UsersService`에 `CodeMappingService` 주입.
- **다음 단계**: Phase 11(Settings) 착수.
- **수동 확인 필요**: `/projects/:id` "빌드 이력" 탭이 실제 Jenkins 빌드 개수만큼 항목을
  보여주고, 재검증을 2회 이상 실행한 프로젝트에서 스코어 변화가 순서대로 나타나는지 —
  실제 Jenkins 파이프라인 환경 필요(Playwright 미도입, AGENTS.md §3.3).
