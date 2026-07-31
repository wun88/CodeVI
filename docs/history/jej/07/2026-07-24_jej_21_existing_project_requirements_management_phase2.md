# [Record] jej_21_existing_project_requirements_management — Phase 2 (마지막)

---

## 1. 작업 개요
- **일시**: 2026-07-24
- **작업자**: Claude (jej031020 세션)
- **대상**: `code-vi-internal/code-vi-front` — `ProjectDetail`, `NewRequirement` 페이지

## 2. 의도 (Intent)
- **작업 동기**: [jej_21 spec](../../../specs/jej_21_existing_project_requirements_management.md) Phase 2 —
  Phase 1에서 백엔드 멤버십 검증을 마쳤으니, 실제로 기존 프로젝트에 요구사항을 추가할 수 있는 진입점을
  프론트에 연결한다. 사용자와 이미 논의해 확정한 방향(새 화면을 만들지 않고 기존 화면 재배선)을 그대로
  구현했다.
- **디자인 결정**:
  - "요구사항 추가" 버튼은 `ProjectDetail.tsx`의 요구사항 섹션 헤더에 넣었다 — `cardHeaderRow`(Phase 6에서
    "AI 분석 실행" 버튼에 이미 쓰인 클래스)를 그대로 재사용해 새 스타일을 추가하지 않았다.
  - `NewRequirement.tsx`가 프로젝트명을 API로 조회하도록 바꾸면서 `useLocation` import 자체를 제거했다 —
    더 이상 라우터 state에 의존하지 않으므로 죽은 import를 남기지 않았다.
  - 저장 후 착지점을 `/projects`(목록)에서 `/projects/:teamProjectId`(상세)로 바꾼 건 "새 프로젝트
    시작하기" 흐름(jej_20 Phase 4)에도 동일하게 적용된다 — 신규 프로젝트든 기존 프로젝트든 요구사항을 막
    추가한 뒤에는 "방금 추가한 게 보이는 화면"으로 돌아가는 게 더 유용하다고 판단했고, 두 흐름을 다르게
    둘 이유가 없어 통일했다.
- **참고 문서**: [jej_21_existing_project_requirements_management.md](../../../specs/jej_21_existing_project_requirements_management.md)

## 3. 결과 (Result)
- **주요 변경 사항**:
  - `code-vi-internal/code-vi-front/src/pages/ProjectDetail/ProjectDetail.tsx`: 요구사항 섹션 헤더에
    "요구사항 추가" 버튼 추가 → `/code-insight/new/:teamProjectId/requirements`로 이동(기존 라우트 재사용,
    신규 라우트 없음).
  - `code-vi-internal/code-vi-front/src/pages/CodeInsight/NewRequirement/NewRequirement.tsx`:
    - 프로젝트명을 `location.state` 대신 `teamProjectService.getProjectDetail(projectId)`로 마운트 시
      조회하도록 변경(`useLocation` import 제거).
    - `goToProjects()` → `goToProjectDetail()`로 이름 변경, 저장 성공 후 이동 경로를
      `/projects` → `/projects/${projectId}`로 변경(직접 등록/AI 생성/CSV 3개 저장 경로 전부 동일 적용).
- **검증 결과**:
    - [x] Lint 통과
    - [x] `npx tsc -b` / `npm run build` 통과
    - [x] `/verify` 스탬프 발급
    - [x] [부분 수동 확인, Browser] `/projects/1` 접속 시 세 API가 정확한 경로로 호출됨을 확인. 이번엔
      실제 백엔드 프로세스가 응답해(이전 Phase들의 502 대신) 401을 반환 — 로그인 세션이 없어 여전히
      랜딩으로 리다이렉트되지만, 프록시가 아니라 실제 서버가 인증을 거부한 것까지 확인했다. 콘솔 에러 없음.
    - [ ] "요구사항 추가" 버튼 클릭 → 입력 화면 진입(프로젝트명 정확히 표시) → 저장 → 상세 화면 복귀까지
      전체 흐름 — **미확인**(로그인 세션 필요)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: 없음.
- **다음 단계**: jej_21은 여기서 완료. 다음 작업은 jej_20 Phase 7(실제 `AstFile`/`AstClass`/`AstFunction`
  데이터 기반 매핑 엔진)로 돌아가거나, 사용자가 우선순위를 다시 정할 수 있다.
