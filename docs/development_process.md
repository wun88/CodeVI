# Development Process (Autonomous Loop)

이 문서는 **Mode 2: 무한 개발 모드**에서 에이전트가 따르는 구현 주기를 정의합니다.
"진행시켜" 트리거 이후 이 루프는 모든 명세가 완료될 때까지 자동 반복됩니다.

---

## Phase 0: 작업 대상 결정
- `docs/specs/` 폴더를 스캔하여 파일명 번호 순으로 정렬한다.
- `docs/history/`에 해당 명세의 완료 기록이 없는 가장 낮은 번호의 명세를 선택한다.
- 해당 명세 파일을 정독하여 목표, Phase, 검증 기준을 파악한다.

## Phase 1: 명세 분석 (Specification Analysis)
- 선택된 명세 내 현재 Phase의 요구사항을 분석한다.
- 불명확한 부분은 인간 개발자에게 즉시 질문(Triage)한다.
- 구현 전 `docs/policy/convention.md`의 코딩 컨벤션을 확인한다.

## Phase 2: 구현 (Iterative Implementation)
- 기능별로 작은 단위의 구현을 수행한다.
- 기존 코드베이스의 패턴과 구조를 존중하며 확장한다.
- 필요한 의존성 설치, 모듈 등록 등 인프라 작업을 포함한다.

## Phase 3: 자가 검증 (Automated Verification)
- 구현이 완료되면 반드시 빌드(`npm run build`) 및 관련 테스트를 실행한다.
- 실패 시 로그를 분석하여 **최소 3회** 스스로 수정을 시도한다.
- 3회 시도 후에도 해결 불가능하면 사용자에게 보고(Triage)한다.

## Phase 4: 기록 및 전진 (History Recording & Advance)
- 검증 통과 후 `docs/history/`에 작업 내역을 기록한다.
  - 파일명: `YYYY-MM-DD_feature_name.md`
  - 필수 항목: 의도(Intent), 결과(Result), 회고(Retrospective)
- 기록이 완료되면 **사용자 승인 없이** 즉시 다음 Phase 또는 다음 명세로 전진한다.
- 모든 명세가 완료되면 최종 보고서를 작성하고 사용자에게 알린다.

---

## Reference Snapshots
- 재구현이 필요한 경우 `docs/history/MASTER_SNAPSHOT_ONBOARDING.md`를 최우선 참조한다.
