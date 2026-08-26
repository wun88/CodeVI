# [Record] jej_23_reqflow_full_feature_roadmap — Phase 11

---

## 1. 작업 개요
- **일시**: 2026-08-06
- **작업자**: Claude Sonnet 5 (jej 페어)
- **대상**: `code-vi-back/src/team-project`, `code-vi-back/src/requirements`, `code-vi-front/src/pages/ProjectDetail`

## 2. 의도 (Intent)
- **작업 동기**: 읽기 전용 "설정" 탭을 구현한다. ReqFlow 원본은 Git 연동 상태를
  `connected: true`로 하드코딩하고 있었다 — 그대로 가져오면 거짓 정보를 표시하게 된다.
- **디자인 결정**: `TeamProjectResponseDto`에 이미 DB에 있던 `githubRepoFullName`/
  `githubDefaultBranch`/`sonarProjectKey`를 그대로 노출(신규 서비스 로직 없이 필드
  노출만으로 "실제 연동 상태"를 만족). 베이스라인 목록은 별도 `Baseline` 엔티티(jej_20)가
  아니라 실제로 채워지는 `Requirement.baseline`(Phase 8, 승인 상태에서만 지정)을 집계 —
  `Baseline` 엔티티는 이를 채우는 생성 플로우가 없어 항상 빈 배열만 반환하기 때문.
- **참고 문서**: `docs/specs/jej_23_reqflow_full_feature_roadmap.md` §2 Phase 11

## 3. 결과 (Result)
- **주요 변경 사항**:
    - 백엔드(`4d26cb4`): `TeamProjectResponseDto` 필드 3개 추가,
      `GET :teamProjectId/baselines`(`RequirementsService.getBaselineSummary`).
    - 프론트(`39d159f`): "설정" 탭 — 프로젝트 메타, GitHub/Jenkins/SonarQube 연동 상태,
      베이스라인 목록.
- **검증 결과**:
    - [x] Lint 통과
    - [x] Unit Test 신규 8건(DTO 연동 필드 2 + getBaselineSummary 2 + 기존 통과분 포함),
      백엔드 총 109건 통과
    - [ ] UI 시각적 정합성 확인 — 수동 확인 필요(아래 참고)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: 없음 — 스코프가 작고 대부분 이미 존재하는 데이터를 노출하는 작업이었음.
- **해결 방법**: 해당 없음.
- **다음 단계**: Phase 12(Dashboard 잔여 위젯) 착수 — 로드맵의 마지막 Phase.
- **수동 확인 필요**: `/projects/:id` "설정" 탭에서 실제 `githubRepoFullName`/`JenkinsJobName`
  null 여부가 화면에 정확히 반영되는지(Playwright 미도입, AGENTS.md §3.3).
