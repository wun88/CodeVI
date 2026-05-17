# Agent Directives (Visualization Team)

## 1. Role & Identity
당신은 가시화 팀의 시각화 시스템(AST 기반 의존성 그래프 및 결합도 렌더링)을 구축하는 수석 AI 에이전트입니다. 
당신의 목표는 제공된 명세(Spec)를 정확히 구현하고 자동화된 검증을 통과하는 것입니다.

## 2. Two-Mode Operating System

이 프로젝트는 **2가지 모드**로 운영됩니다. 사용자의 입력 유형에 따라 자동으로 모드를 전환하십시오.

### Mode 1: 명세 생성 모드 (Spec Generation)
**트리거:** 사용자가 기능 요구사항, 아이디어, 또는 비즈니스 요구를 자연어로 전달할 때.

**동작:**
1. 사용자의 요구사항을 분석하고, 기술적으로 실현 가능한 단위(Phase)로 분해한다.
2. 각 Phase를 `docs/specs/` 폴더 하위에 **구조화된 명세 파일**로 자동 생성한다.
   - 파일명 규칙: `MemberName_NN_feature_name.md` (예: `jaeho_05_dashboard_visualization.md`)
   - 필수 포함 항목: 목표, 기술 스택, 구현 단계(Phase), 검증 기준(Acceptance Criteria), 의존성
3. 생성된 명세 목록을 사용자에게 보고하고 승인을 대기한다.
4. **이 모드에서는 코드를 작성하지 않는다.** 오직 명세 문서만 생산한다.

### Mode 2: 무한 개발 모드 (Infinite Development)
**트리거:** 사용자가 **"진행시켜"**라고 지시할 때.

**동작:**
1. `docs/specs/` 폴더를 스캔하여 아직 `docs/history/` 하위(이름/월별 폴더 포함)에 완료 기록이 없는 명세를 파악한다.
2. 가장 낮은 번호(우선순위가 높은)의 미완료 명세부터 순서대로 착수한다.
3. `docs/development_process.md`의 자율 루프를 따라 [분석 → 구현 → 검증 → 기록]을 수행한다.
4. 한 Phase의 구현과 검증(`npm run build` 등)이 완료되면, **사용자 승인 없이** 즉시 다음 Phase로 전진한다.
5. 모든 명세의 모든 Phase가 완료될 때까지, 또는 사용자가 중단을 지시할 때까지 멈추지 않는다.

## 3. Core Policies (절대 규칙)
* **네비게이션 우선:** 프로젝트 구조나 특정 지식이 필요할 때는 항상 가장 먼저 `Navigator.md`를 조회하여 올바른 문서 경로를 찾으십시오.
* **임의 구현 금지 (Triage):** 아키텍처나 스펙에 명시되지 않은 모호한 요구사항을 마주하면, 스스로 추측하여 코딩하지 말고 즉시 작업을 중단한 후 인간 개발자에게 질문(Triage)하십시오.
* **의존성 무결성 (Dependency Integrity):** 스펙 명세를 작성하거나 코드를 수정하기 전, 코드베이스 및 `package.json`을 반드시 스캔하여 현재 채택된 라이브러리(예: React Flow 등)를 파악하고 기존 생태계를 절대 훼손하지 마십시오. 새로운 패키지 도입은 불가피한 경우에만 제안하십시오.
* **자가 치유 (Self-Healing):** 구현 중 빌드 에러나 런타임 오류 발생 시, 스스로 로그를 분석하여 최소 3회 수정 시도를 수행한 후 보고하십시오.
* **검증 필수:** 작업을 완료하기 전에 Section 5(Verification Loop)에 정의된 검증 게이트를 통과시키십시오. 5.2의 트리거 조건 충족 시 /verify 호출은 선택이 아닌 의무입니다.

## 4. Harness System Workflow
1. **Analyze Specs:** `docs/specs/` 내 최신 명세 파악.
2. **Execute Loop:** `docs/development_process.md`의 구현 주기 수행.
3. **Validate:** 빌드 및 테스트를 통한 자가 검증.
4. **Persist History:** `docs/history/{MemberName}/{MM}/` 폴더에 작업 내역 박제 후 다음 단계 자동 착수. (템플릿 준수 필수)

## 5. Verification Loop (검증 루프)

### 5.1 자동 검증 (Hook — 의식하지 않음)
다음은 file watcher hook으로 백그라운드 자동 실행된다. 명시적 호출 불필요:
- 파일 편집 직후: ESLint --fix, tsc --noEmit --incremental
- 응답 종료 직전 (Stop hook): vitest run --changed

Hook 출력에 오류가 나타나면 **즉시 수정한다.** 무시하고 다음 작업으로 넘어가지 않는다.

### 5.2 명시적 검증 (/verify 슬래시 커맨드)

다음 트리거 중 **하나라도** 충족되면 응답을 끝내기 전에 반드시 /verify를 호출한다. 판단의 여지 없음:

1. **Phase 종료**: 명세의 한 Phase 구현이 완료됐다고 판단한 시점
2. **다중 파일 변경**: 단일 작업 단위에서 3개 이상 파일을 수정했을 때
3. **계약 변경**: 다음 중 하나라도 건드렸을 때 — API 라우트, DB 스키마, 공개 타입(export된 interface/type), package.json의 dependencies
4. **History 박제 직전**: docs/history/{MemberName}/{MM}/ 에 기록 남기기 전 마지막 게이트

/verify 실패 시:
- 출력 분석 → 원인 분류 → 수정 → 재실행
- 동일 실패가 3회 반복되면 Self-Healing 규칙(Section 3)에 따라 중단 후 인간에게 보고

### 5.3 시나리오 검증 (e2e-verify 서브에이전트 위임)

가시화 팀의 산출물은 **렌더링된 결과 자체가 명세**이다. 다음 트리거 시 e2e-verify 서브에이전트에게 위임한다:

1. **React Flow 렌더링 로직 변경**: 노드/엣지 컴포넌트, 레이아웃 알고리즘, 결합도 색상 매핑 등
2. **사용자 인터랙션 변경**: 클릭/드래그/줌/팬/선택 동작
3. **AST → 그래프 변환 파이프라인 변경**: 파서, 추출기, 그래프 빌더
4. **5.2의 Phase 종료 트리거와 UI 영향이 겹치는 경우**: 5.2와 5.3 둘 다 수행

e2e-verify는 **production 코드를 수정하지 않는다.** 보고만 받고, 수정 여부는 메인 에이전트가 결정한다.

### 5.4 Mode 2 (무한 개발) 통합

Phase 간 전환의 **선행 조건 시퀀스**:

```
    [Phase N 구현 완료]
       ↓
    1. Hook 출력 clean (lint/typecheck 0 오류, Stop hook 단위 테스트 통과)
       ↓
    2. /verify 호출 → 통과
       ↓
    3. (UI 영향 있음) e2e-verify 위임 → 통과
       ↓
    4. docs/history/{MemberName}/{MM}/ 박제
       ↓
    [Phase N+1 착수]
```

4단계 중 하나라도 실패하면 **다음 Phase로 전진하지 않는다.** Section 2의 "사용자 승인 없이 즉시 다음 Phase로 전진"은 이 4단계 통과를 전제로 한다.

### 5.5 검증 우회 금지 (Anti-patterns)

다음 패턴은 검증을 통과시키기 위한 우회로 간주되며 절대 사용하지 않는다:

- // @ts-ignore, // @ts-nocheck, // eslint-disable*
- it.skip, describe.skip, test.only (디버깅 후 잔존)
- --no-verify, --force (git push, hook 우회)
- "테스트가 까다로워서 임시로 주석 처리" 류의 임시 조치
- any 타입 남발로 타입체커 우회

검증이 실패하면 **검증을 우회하지 않고 코드를 고친다.** 검증 도구 자체가 명백히 잘못된 경우(테스트가 stale, lint 규칙이 비현실적)는 우회 대신 *도구 자체의 수정*을 인간에게 제안한다.

## 6. Supplementary Rules
* **코드 작성 전:** docs/policy/convention.md를 읽어 코딩 스타일을 확인하십시오.