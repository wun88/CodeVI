# [Record] jej_23_reqflow_full_feature_roadmap — Phase 12 (로드맵 마지막 Phase)

---

## 1. 작업 개요
- **일시**: 2026-08-06
- **작업자**: Claude Sonnet 5 (jej 페어)
- **대상**: `code-vi-back/src/requirements`, `code-vi-front/src/pages/ProjectDetail`

## 2. 의도 (Intent)
- **작업 동기**: Dashboard 잔여 위젯(라이프사이클 진척바/상태 분포/빌드 타임라인/최근 활동/
  Analysis 인라인 확장)을 채워 로드맵을 마무리한다.
- **디자인 결정**: 스펙 §4가 "미확인 전제"로 남겨둔 ReqFlow 원본의 5단계 라이프사이클 %
  산식(`useWorkflow.ts` 추정)을 실제로 확인한 결과, 그 파일은 라우트→단계 매핑용
  브레드크럼일 뿐이었고 실제 % 계산은 `src/utils/dashboard.ts::computeLifecycleProgress`
  였다(approved/baseline 비율 등을 섞어 계산). CodeVi는 이미 Phase 7/9/10 산출물로 더
  명확하게 대응시킬 수 있어 스펙에 이미 적혀 있던 CodeVi 전용 기준(도출/분석=요구사항 존재
  여부, 명세화=문서 생성 여부, 검증=매핑 완료 비율, 추적=빌드 연동 여부)을 그대로 채택했다
  — ReqFlow 산식을 문자 그대로 베끼지 않기로 의도적으로 확정.
  상태 분포 도넛/커버리지 카드는 Phase 7이 한 번도 실행되지 않은 프로젝트에서 "전부
  미구현"만 보여 오해를 주므로 `mapping.mapped > 0`일 때만 렌더링(§2 완료 조건).
  빌드 타임라인 차트는 Phase 10의 build-history가 이미 계산해 둔 빌드별 평균 점수를
  그대로 재사용(score-timeline 원시 스냅샷을 다시 집계하지 않음 — 중복 계산 방지).
  최근 활동 피드는 별도 activity 테이블 대신 Phase 8의 `RequirementVersion` 생성 시점을
  재사용(§2 명시 사항). Analysis 인라인 확장의 "권장조치" 버튼은 원본도 미구현(alert)이라
  실제 동작하는 "요구사항으로 이동"만 남겼다.
- **참고 문서**: `docs/specs/jej_23_reqflow_full_feature_roadmap.md` §2 Phase 12, §4

## 3. 결과 (Result)
- **주요 변경 사항**:
    - 백엔드(`7be8bcf`): `GET :teamProjectId/activity`(RequirementVersion 재사용),
      `GET :teamProjectId/analysis/findings`(전체 findings, 재계산 없이 조회).
    - 프론트(`45fc8e6`): `LifecycleProgressBar`, `StatusDistributionDonut`(recharts),
      `BuildTimelineChart`(recharts), `RecentActivityFeed`, `AnalysisFindingsPanel`(전체
      보기 토글+findings 테이블+설명 패널) 신규 컴포넌트, `ProjectDetail`에 배치.
    - 후속 수정(`3afa8a2`, 사용자 UI 피드백): 요구사항 상태/점수 필터가 native `<select>`라
      옵션 목록이 OS 팝업으로 렌더링돼 다크 테마와 대비가 안 맞는 문제를 발견 —
      `CodeInsight/InstantInsight.tsx`의 기존 커스텀 언어 드롭다운 패턴을 그대로 재사용한
      `FilterDropdown` 컴포넌트로 교체.
- **검증 결과**:
    - [x] Lint 통과
    - [x] Unit Test 신규 5건(getRecentActivity 3 + getAllFindings 2), 백엔드 총 114건 통과
    - [x] 프론트 dev 서버(:5174)·백엔드 dev 서버(:13000) 기동 확인, 신규 라우트가 401(인증
      거부)로 응답해 정상 등록됐음을 확인(404 아님)
    - [ ] 전체 인증 플로우를 포함한 브라우저 클릭스루는 미실시 — 수동 확인 필요(아래 참고)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: recharts 차트에 CSS 커스텀 프로퍼티(`var(--internal-surface)`)를 SVG
  `stroke` 속성에 바로 넘기면 브라우저 호환성이 불확실해, 이미 이 페이지에서 리터럴로
  쓰이고 있던 `#0a0e14`(`.connectBtn`의 색과 동일)를 그대로 재사용했다.
- **해결 방법**: 새 팔레트를 고르지 않고 `QualityDonut.tsx`/`MetricsRadarSection.tsx`에서
  이미 검증돼 쓰이고 있는 rgba 색을 그대로 재사용(dataviz 스킬의 "디자인 시스템 파라미터
  재사용" 원칙과 일치).
- **다음 단계**: jej_23 로드맵(Phase 7~12) 전체 완료 — spec `status: done`으로 갱신.
  후속 작업은 사용자 지시 대기.
- **수동 확인 필요**: `/projects/:id` 개요 탭에서 라이프사이드바 진척률, 도넛차트, 빌드
  타임라인, 최근 활동, Analysis "전체 보기" 토글이 실제 브라우저에서 의도대로 렌더링/
  동작하는지(Playwright 미도입, AGENTS.md §3.3).
