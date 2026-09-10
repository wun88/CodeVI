---
id: yejin_08_requirement_relation_graph
status: done
owner: yejin
created: 2026-09-09
history:
  - docs/history/yejin/09/2026-09-09_yejin_08_requirement_relation_graph.md
---

# Spec: 08_requirement_relation_graph (요구사항-코드 관계 그래프)

## 0. 사실 확인 (현재 상태)

- **의존관계 데이터 계층은 이미 존재한다.** `RequirementDependency` 엔티티
  (`code-vi-internal/code-vi-back/src/requirements/entities/requirement-dependency.entity.ts`)와
  `RequirementDependencyService`(순환참조 BFS 차단 포함, `requirement-dependency.service.ts:88-112`).
- **요구사항-코드 유사도 데이터도 이미 존재한다.** `GET /api/requirements/:id/mapping-detail`
  (`requirements.controller.ts:213`) → `MatchDetailItemDto[]`
  (`dto/match-detail.dto.ts`: `type: 'file'|'class'|'function'`, `name`, `path`, `score` 0~100 정수).
  프론트는 이 API를 `RequirementDetailModal`에서 이미 호출해 텍스트 목록으로만 쓰고 있었다
  (`RequirementDetailModal.tsx:104`, `:286-303`).
- **클래스/함수 후보도 자기가 속한 파일 경로를 `path`에 담는다**
  (`code-mapping.service.ts:82-108` — file/class/function 모두 `path: filePath`).
  따라서 `path`로 그룹핑하면 "파일 1건 + 그 안의 클래스/함수" 중첩 구조를 서버 변경 없이 만들 수 있다.
- **`buildNumber`에 해당하는 소스는 없다.** `ValidationDetail` 엔티티에 빌드 번호 컬럼이 없다
  (`entities/validation-detail.entity.ts`).
- **매핑 상태(linked/partial/missing)를 주는 필드도 없다.** `MatchDetailItemDto`는 점수만 준다.
- **그래프 렌더링 스택은 이미 깔려 있다**: `@xyflow/react` ^12.10.2, `dagre` ^0.8.5
  (`code-vi-front/package.json`). 단, 이번 그래프는 좌표가 고정된 소형 다이어그램이라
  레이아웃 엔진이 필요 없어 순수 SVG로 그린다.
- **이 기능은 jej_23에서 의도적으로 유예된 항목이다**:
  `docs/specs/jej_23_reqflow_full_feature_roadmap.md:386` —
  "RelationshipGraph(SVG 관계 그래프) | 1차 제외, 후순위 검토 | 실사용 데이터로 가치 검증 후 추가".
  본 spec이 그 회수분이다.

## 1. 목표

요구사항 상세 화면에서 "이 요구사항이 어느 코드에 얼마나 구현돼 있는가"를 한눈에 보게 한다.
지금은 매칭된 코드 요소가 평면 텍스트 목록이라 파일/클래스/함수의 소속 관계와 유사도 분포가
드러나지 않는다.

사용자 흐름: `/dashboard/:teamProjectId` → 요구사항 클릭 → 상세 모달 → 영향분석 섹션에
요구사항을 중심 노드로 둔 노드-링크 그래프가 보인다. 코드 파일 노드를 클릭하면 선택 상태가 되고,
같은 경로의 하단 매칭 목록 항목이 함께 강조된다.

## 2. 구현 단계 (Phases)

### Phase 1: 관계 그래프 컴포넌트 + 요구사항 상세 연동

- 작업:
  - `interface/relationshipGraph.interface.ts`: `CodeMatchDetail`, `ConnectionStrength`, `CodeMatchStatus`
  - `utils/relationshipGraph.ts`: 유사도→시각 인코딩 4함수 + 평면 목록을 파일 단위로 접는
    어댑터 `buildCodeMatchDetails`
  - `components/RelationshipGraph/RelationshipGraph.tsx` + `.module.css`: 순수 SVG
    (`viewBox="0 0 700 420"`), 외부 차트 라이브러리 미사용
  - `RequirementDetailModal`: 영향분석 섹션 매칭 목록 위에 배치, `selectedFile` 상태로 목록과 연동

- 시각 인코딩 규칙 (범례와 1:1):
  | 유사도 | 색 | 굵기 | 선 |
  |---|---|---|---|
  | ≥ 0.85 (강함) | `#22C55E` | 3 | 실선 |
  | 0.7 ~ 0.85 (보통) | `#0064FF` | 2 | 실선 |
  | 0.4 ~ 0.7 (약함) | `#F59E0B` | 1 | 점선 `4 4` |
  | < 0.4 | — | 0 | 렌더링하지 않음 |

- 레이아웃: 요구사항 노드 중심 `(80,180)` / rect 140x72 rx12,
  코드 파일 노드 `i`번째 `translate(380, 40 + i*72)` / rect 280x48 rx8,
  연결선 `(150,180) → (380, y+24)`, 유사도 % 라벨은 선 중점,
  함수 서브노드는 파일당 최대 2개 `translate(400, y+52+fi*18)`.

- 완료 조건 (Acceptance Criteria):
  - `node .claude/scripts/verify.mjs` 통과 (front: `tsc -b` + `npm run build`)
  - `npx --no-install eslint src/components/RelationshipGraph/RelationshipGraph.tsx
    src/utils/relationshipGraph.ts src/interface/relationshipGraph.interface.ts
    src/pages/ProjectDetail/RequirementDetailModal.tsx` 무출력
  - `buildCodeMatchDetails`가 같은 `path`의 file/class/function 항목을 `CodeMatchDetail` 1건으로
    접고, 파일 점수 내림차순으로 정렬한다
  - `[수동 확인]` `/dashboard/:teamProjectId` → 요구사항 클릭 → 상세 모달 → 영향분석 섹션:
    ① 그래프가 렌더링된다 ② 선 색/굵기/점선이 위 표대로다 ③ 파일 노드 클릭 시 테두리가
    강조되고 하단 매칭 목록의 같은 경로 항목이 함께 강조된다 ④ 매칭 데이터가 없는 요구사항에서는
    그래프 블록이 아예 나타나지 않는다

### Phase 2: 프로젝트 개요 "요구사항-코드 매핑" 카드에 배치

- 배경: Phase 1은 요구사항 상세 모달에만 넣었는데, 원래 의도한 위치는 개요 탭의
  "요구사항-코드 매핑" 카드였다(그때까지 "N개 중 M개 매핑됨" 한 줄이 전부였다).
- 그래프는 요구사항 1건을 중심 노드로 그리고 `mapping-detail`도 요구사항 단위 API라
  프로젝트 전체를 한 번에 그릴 수 없다 → 드롭다운으로 대상을 고르고 선택할 때마다 1건 조회한다.
- 작업:
  - `pages/ProjectDetail/MappingGraphSection.tsx` + `.module.css` 신설.
    대상은 `matchCount > 0`인 요구사항만, 기본 선택은 `implementationScore` 최상위.
    드롭다운은 기존 `FilterDropdown`을 재사용한다.
  - `ProjectDetail`의 매핑 카드 배너 아래에 배치. 카드는 이미 전체 폭
    (`dashboardGrid`가 `grid-template-columns: 1fr`)이라 레이아웃 변경은 없다.
  - 모달의 그래프는 그대로 둔다 — 카드는 프로젝트 전체 조망, 모달은 개별 심층 보기로 역할이 다르다.
- 완료 조건:
  - `node .claude/scripts/verify.mjs` 통과
  - 기본 선택이 매핑 점수 최상위 요구사항이고, 미매핑 요구사항은 드롭다운에 나오지 않는다
  - 드롭다운 전환 시 그래프가 해당 요구사항의 매칭으로 교체된다
  - `[수동 확인]` 개요 탭 "요구사항-코드 매핑" 카드에서 위 3가지

## 3. 의존성

- 선행 spec: `jej_23_reqflow_full_feature_roadmap`(Phase 7 — mapping-detail API가 이 spec의 산출물)
- 신규 패키지: **없음**. 순수 SVG로 그려 `@xyflow/react`/`dagre`/`recharts` 어느 것도 추가 사용하지 않는다.
- 계약 변경: **없음**. 백엔드 API/스키마/DTO 무변경, 프론트 전용 추가.
- 신규 export 타입: `CodeMatchDetail`, `ConnectionStrength`, `CodeMatchStatus`

## 4. 검증 계획

`/verify` 게이트 외에 위 Phase 1의 `[수동 확인]` 4개 항목. 이 레포에 E2E가 없어
(AGENTS.md 3.3) UI 렌더링은 자동 검증이 불가능하다.
