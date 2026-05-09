# Implementation Record: Internal Dark Cinematic Theme Unify

## 1. 작업 개요
- **일시**: 2026-05-08
- **작업자**: Cursor Agent (GPT-5.2)
- **대상**: `code-vi-internal/code-vi-front` internal UI 테마 통일 (Phase 1~3 일부)

## 2. 의도 (Intent)
- **작업 동기**: internal 전 페이지가 메인 hero(“RE:FACTORY analysis system”)와 동일한 세계관으로 느껴지도록, 밝은 SaaS/pastel UI 흔적을 제거하고 dark cinematic developer tool 톤으로 통일.
- **디자인 결정**: 전역 토큰(CSS 변수)을 먼저 정의해, 페이지별 CSS를 “토큰 치환 + glass surface” 방식으로 점진 통일(레이아웃/기능 구조 유지).
- **참고 문서**: `docs/specs/yejin_07_internal_dark_cinematic_theme_unify.md`

## 3. 결과 (Result)
- **주요 변경 사항**:
  - `code-vi-internal/code-vi-front/src/index.css`
    - internal 다크 테마 토큰(`--internal-*`) 추가
    - `body`의 기본 background/text 색상 지정 + selection 톤 통일
  - `code-vi-internal/code-vi-front/src/pages/CodeInsight/CodeInsight.css`
    - 밝은 배경/화이트 카드 제거 → glass surface + border + dark text tokens로 치환
  - `code-vi-internal/code-vi-front/src/pages/CodeInsight/ZipUpload/ZipUpload.css`
    - dropzone/가이드/버튼을 dark glass 톤으로 통일
  - `code-vi-internal/code-vi-front/src/pages/CodeInsight/GitHubConnect/GitHubConnect.css`
    - 연결 카드/레포 목록/선택 상태를 dark glass + accent 토큰 기반으로 통일
  - `code-vi-internal/code-vi-front/src/pages/CodeInsight/Dashboard/Dashboard.css`
    - 대시보드 카드/바/상태색을 토큰 기반 dark 톤으로 정리
  - `code-vi-internal/code-vi-front/src/components/AuthPanel/AuthPanel.css`
    - AuthPanel의 밝은 배경/파란 포커스/그라데이션 버튼을 dark glass + muted cyan focus로 변경(네온/파란 outline 제거)
- **빌드/타입 무결성 보강(기존 TS 에러 정리 포함)**:
  - `src/pages/CodeInsight/Dashboard/Dashboard.tsx`: status/type 명시 타입 추가로 `tsc` 에러 해결
  - `src/pages/CodeInsight/GitHubConnect/GitHubConnect.tsx`: Repo 타입 도입 + state 타입 명시
  - `src/pages/CodeInsight/ZipUpload/ZipUpload.tsx`: Drag/Change 이벤트 및 ref/null 안전 처리
  - `src/components/ProjectOnboardingPanel/ProjectOnboardingPanel.tsx`: unused import 제거
  - `src/components/Header/Header.tsx`: `HeaderProps`에 `onLogout?` 추가(대시보드 호출부 타입 에러 해소)

- **검증 결과**:
  - [x] `npm run build` 통과 (`tsc -b` + `vite build`)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: internal 프로젝트에 기존부터 남아있던 TypeScript `noImplicitAny`/state 타입 추론 오류가 `build`를 막고 있었음.
- **해결 방법**: 화면 구조를 바꾸지 않고(기능 유지), 최소한의 명시 타입/유틸 타입으로 빌드 무결성을 확보한 뒤 테마 토큰 치환을 진행.
- **다음 단계**:
  - `VisualizationPage`, `DashboardPage.module.css` 등 나머지 주요 페이지도 surface/border/text 토큰으로 단계적 통일
  - 공통 UI primitive(버튼/인풋/카드) 컴포넌트가 존재한다면 해당 레벨로 스타일을 끌어올려 중복 CSS 감소

