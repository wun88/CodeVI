# [Record] jej_23_reqflow_full_feature_roadmap — Phase 9

---

## 1. 작업 개요
- **일시**: 2026-08-06
- **작업자**: Claude Sonnet 5 (jej 페어)
- **대상**: `code-vi-back/src/requirements`, `code-vi-front/src/pages/ProjectDetail`

## 2. 의도 (Intent)
- **작업 동기**: 요구사항 기반 SRS/PRD/BRS 문서 생성 기능을 이식한다.
- **디자인 결정**: ReqFlow 원본(`documentGenerator.ts`)은 특정 데모 회사("Enterprise User
  Portal")를 가정한 고정 서술 텍스트가 섞여 있었다 — 그대로 가져오면 실제 프로젝트 문서인
  것처럼 거짓 정보를 보여주게 된다. 실제 요구사항 데이터로 계산 가능한 섹션(기능/비기능
  목록, 수용 기준, 추적성 매트릭스, 업무 요구사항)은 계산하고, 계산 불가능한 서술형 섹션은
  프로젝트명만 반영한 뒤 "직접 작성해주세요" 플레이스홀더로 대체했다. 추적성 매트릭스는
  ReqFlow의 가짜 목업 대신 Phase 7의 실제 `TraceabilityRecord`를 사용. PDF/DOCX 내보내기는
  원본도 미구현(mock alert)이었으므로 제외하고 Markdown 클립보드 복사로 대체(§4 근거).
  "AI 재생성" 문구는 "템플릿 재생성"으로 정정 — 실제로는 현재 요구사항 데이터로 해당 섹션만
  다시 계산하는 결정적 동작이라 AI가 아니다.
- **참고 문서**: `docs/specs/jej_23_reqflow_full_feature_roadmap.md` §2 Phase 9

## 3. 결과 (Result)
- **주요 변경 사항**:
    - 백엔드(`75374b7`): `GeneratedDocument` 엔티티(FK CASCADE), `lib/document-generator.ts`
      순수 함수, `DocumentsService`(generate/updateSection/regenerateSection/getQualityCheck),
      `GET/POST/PATCH :teamProjectId/documents...` 엔드포인트(문서 조회를 teamProjectId로
      스코프해 IDOR 방지).
    - 프론트(`af5ee33`): `/projects/:id`에 "문서" 탭 추가(탭 아키텍처 §1.2) — 문서 생성 폼,
      섹션별 편집/재생성, 품질체크, Markdown 복사.
- **검증 결과**:
    - [x] Lint 통과
    - [x] Unit Test 신규 18건(document-generator 10 + DocumentsService 8), 백엔드 총 96건 통과
    - [ ] UI 시각적 정합성 확인 — 수동 확인 필요(아래 참고)

## 4. 회고 및 공유 사항 (Retrospective)
- **발생한 문제**: 없음(원본 대비 축소 범위가 이미 스펙 §4에 명시돼 있어 설계 판단이 명확했음).
- **해결 방법**: 해당 없음.
- **다음 단계**: Phase 10(Build History) 착수.
- **수동 확인 필요**: `/projects/:id` "문서" 탭에서 SRS/PRD/BRS 생성 → 섹션 편집 → 템플릿
  재생성 → Markdown 복사가 브라우저에서 실제로 동작하는지(Playwright 미도입, AGENTS.md §3.3).
