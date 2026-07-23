---
id: { member }_{ NN }_{ feature }
status: draft # draft → approved → in-progress → done
owner: { member }
created: YYYY-MM-DD
history: # done 처리 시 docs/history/ 기록 파일 경로를 여기에 추가
---

# Spec: {제목}

## 0. 사실 확인 (현재 상태)

<!--
코드를 실제로 읽고 확인한 사실만 적는다. 추측 금지.
각 항목에 근거가 되는 파일 경로(가능하면 라인)를 남긴다.
이 섹션이 부실한 spec은 승인될 수 없다.
-->

## 1. 목표

<!-- 왜 필요한가 한 문단 + 사용자 흐름 요약 -->

## 2. 구현 단계 (Phases)

<!-- Phase 하나 = /verify 통과 + 커밋 1개 단위. 작게 쪼갠다. -->

### Phase 1: {이름}

- 작업:
- 완료 조건 (Acceptance Criteria) — **실행 가능한 명령 + 기대 결과**로 적는다:
  - 예: `cd code-vi-internal/code-vi-back && npm test -- metric` 통과
  - 예: `GET /api/analysis/:id` 가 `{ success: true, data: {...} }` 반환
  - 자동 검증 불가능한 항목은 `[수동 확인]` 접두어를 붙이고 확인 절차를 적는다

## 3. 의존성

<!-- 선행 spec(id), 필요 패키지(도입 근거 필수), 영향받는 계약(API/스키마/타입) -->

## 4. 검증 계획

<!-- /verify 게이트 외에 추가로 필요한 확인. 없으면 "없음" -->
