# PR #37 구현 계획안 — 다국어 examine 실측 지표 연결

> ## 진행 상태 (2026-07-10 갱신)
> **결정**: ① 현재 master에서 재적용 브랜치 `feat/connect-examine` ② examine은 **Python만** 먼저.
>
> **완료 (코드, 이 PC에서 빌드 검증됨)**
> - 백엔드 통합 완료 — `nest build` exit 0. 20파일 변경(신규 code-graph/examine 모듈 + build-report dual-write + applyClassMetrics + Jenkinsfile 하이브리드 템플릿). 임시 `src/metric` CK 경로 제거.
> - **프론트는 변경 불필요** — `buildSnapshotOverview.ts`가 이미 `AstClass.metrics`를 소비함. 지표가 상수(84/75/76)로 보인 건 metrics가 비어 `|| 폴백`이 켜졌기 때문. examine가 채우면 4카드가 자동 실측화.
>
> **남은 것 (노트북 서버에서만 가능)**
> - Python examine 컨테이너(`codevi-pyexamine:3003`) 배포 → 아래 "Python examine 배포" 절.
> - e2e 1회: 온보딩→빌드→대시보드 4지표 실측 확인.
>
> ---
>
> ## Python examine 배포 (노트북 서버)
> examine 컨테이너는 `rlawogh1005/pyexamine` 레포에 있음(PR #2에 완결된 compose 존재). Python만 기동:
> ```bash
> docker network create shared-net 2>/dev/null || true
> git clone https://github.com/rlawogh1005/pyexamine && cd pyexamine
> git checkout feat/multilang-codegraph-examine      # 또는 main에 머지 후
> docker compose up -d --build codevi-pyexamine       # 3003, shared-net, 파이썬 서비스만
> # 검증: 백엔드 컨테이너에서
> docker exec codevi-backend curl -s -X POST codevi-pyexamine:3003/codegraph -F "file=@/tmp/sample.zip" | head -c 300
> ```
> CodeVi 백엔드/Jenkinsfile은 이미 `codevi-pyexamine:3003`을 shared-net 서비스명으로 참조하므로 CodeVi 쪽 compose 추가 불필요.
> Jenkins `agent any` 잡은 tree-sitter(3001)와 동일하게 shared-net에서 3003에 도달함.
>
> ---


> 목표: 대시보드 4개 품질 지표(함수-클래스 복잡도 / 응집-변수 / 의존성 안정성 / 유지보수성)를
> **하드코딩·0** → **언어별 examine 컨테이너가 계산한 실측값**으로 전환.
> 방식: 새 분석 로직을 짜는 게 아니라, **이미 코드로 존재하는 두 PR을 통합·배포·검증**한다.

---

## 0. 사실 확인 (현재 상태)

### 아키텍처 (진짜 데이터 경로)
```
Jenkins(분석 주입 Job)
  └─ zip → examine 컨테이너 /codegraph (언어별 라우팅)
        python→3003 · c→3004 · java→3005 · ts→3006
  └─ 응답 { language, parser, units[], relations[], findings[], catalog }
        · units[].metrics  = CK/OO 실측값
        · findings[]        = 코드 스멜 (8 카테고리)
  └─ POST /api/users/build-report  { astNodes, classMetrics[], codeGraph{units,relations,findings} }
        · applyClassMetrics()  → AstClass.metrics 채움  (← 지표가 0이 아니게 되는 지점)
        · codeGraphService.ingest() → 캐노니컬 code_unit/relation/finding 저장
  └─ 프론트: CanonicalGraphView + 제너릭 메트릭 카드 (실측 렌더)
```

### 두 PR의 역할 분담 (핵심)
| 레포 / PR | 내용 | 로직? | 상태 |
|---|---|---|---|
| **rlawogh1005/pyexamine #2** (`feat/multilang-codegraph-examine`) | 4개 언어 examine **HTTP 서비스**(`service/`) — `/health`+`/codegraph`. `advanced_*` 분석기 위에 얹은 래퍼 | ✅ **진짜 분석 로직** (advanced_* 재사용) | OPEN, 22파일 +3008. 4컨테이너 healthy 검증됨 |
| **CodeVi #37** (`jaeho/faet-connection`) | 백엔드 배선(ExamineService 클라이언트, code-graph 저장 모듈, applyClassMetrics, build-report dual-write) + Jenkinsfile v4 + 프론트 캐노니컬 컷오버 | ❌ **로직 없음, 엔드포인트/저장만** | OPEN, 53파일 +2261. master와 **CONFLICTING** |

### 통합을 막는 3가지 사실
1. **PR #37은 20커밋 전 master(`46379ee`) 기반** → 지금 라이브인 CI/CD·Cloudflare 터널·리버스프록시·보안·온보딩·대시보드 그룹핑이 전혀 없음. `gh` 상태 `CONFLICTING/DIRTY`.
2. **examine 컨테이너 4개가 아직 배포 안 됨** (별도 PR #2 미머지, 노트북 서버에 미기동).
3. **master의 임시 CK(`b970709`, src/metric)는 폐기 대상** — tree-sitter AST 포맷 불일치로 항상 0. PR #37 경로로 대체.

### 충돌 면 (PR #37 ∩ 최근 20 master 커밋이 함께 건드린 파일)
- 백엔드: `github/github.service.ts`(Jenkinsfile 템플릿), `onboarding.service.ts`, `jenkins/jenkins.service.ts`, `users/users.service.ts`(build-report), `ast-relational/ast-relational.service.ts`, `ast-relational/entity/ast-class.entity.ts`, `Dockerfile`
- 프론트: `hooks/useDashboardData.ts`, `pages/DashboardPage/DashboardPage.tsx`, `interface/ast.interface.ts`, `services/api.ts`, `services/astDataService.ts`, `services/authService.ts`

---

## 1. 표준 작업 절차 (모든 Phase 공통)
로드맵 규칙 준수: ① 작업 브랜치 분리(master 직접 수정 금지) ② 고치기 전 갭 실측 재현 ③ 최소변경·기존자산 재사용 ④ 로컬 e2e(curl→DB→프론트 눈으로) ⑤ 주입 템플릿(`getJenkinsfileTemplate`)과 `docs/analysis-pipeline.Jenkinsfile` 동기화 ⑥ "검증" green일 때만 완료.

> 인프라 분리 주의: **이 PC = 코드/빌드 검증**, **노트북 서버 = Jenkins/Sonar/examine 컨테이너 실연동 검증**.

---

## Phase A — examine 컨테이너 배포 (데이터 소스 먼저)
**왜 먼저**: 컨테이너가 `/codegraph`를 200으로 응답해야 이후 백엔드 통합을 실증할 수 있다. 데이터 만드는 쪽 먼저.

- [ ] A1. `rlawogh1005/pyexamine` PR #2 리뷰 → 4개 서비스 빌드 재현 (Python/C/Java/TS)
- [ ] A2. PR #2 머지 (또는 브랜치 그대로 노트북 서버에 배포)
- [ ] A3. 노트북 서버 docker compose에 4개 서비스 기동 + `shared-net` 연결
  - 컨테이너명/포트 **PR #37 기본값과 일치 필수**: `codevi-pyexamine:3003`, `codevi-cexamine:3004`, `codevi-jexamine:3005`, `codevi-tsexamine:3006`
- [ ] A4. 각 언어 샘플 zip으로 `POST /codegraph` 스모크 — `units[].metrics`에 CK 값이 실제로 있는지 확인

**검증(green 기준)**: 4컨테이너 `/health` 200 · 샘플 zip → `/codegraph` 200 · 응답 `units[].metrics` 비어있지 않음(예: Java `class.metrics.cbo>0`) · C는 DIT/NOC = N/A 표기 확인.

---

## Phase B — 백엔드 통합 (PR #37을 현재 master 위로)
**왜**: PR #37 배선(examine 클라이언트·code-graph 저장·applyClassMetrics·dual-write)을 라이브 master의 배포/보안 작업을 깨지 않고 얹는다.

### B1. 통합 방식 결정 — **rebase 대신 "재적용" 브랜치** 권장
PR #37은 20커밋 뒤처졌고 충돌 파일이 서로 다른 세대라 rebase 충돌이 큼. 대신:
- `feat/connect-examine` 브랜치를 **현재 master에서** 생성.
- PR #37에서 **충돌 없는 신규 모듈은 통째로 가져오기**(cherry-pick/copy): `src/code-graph/**`, `src/examine/**`, `src/code-graph/metric-catalog.ts`, 프론트 `codeGraph.interface.ts`·`codeGraphToFlow.ts`·`CanonicalGraphView.tsx`·`codeGraphAdapters.ts`·`codeGraphService.ts` 등 (master에 존재하지 않는 파일 = 무충돌).
- **충돌 파일은 master 버전 위에 PR #37 변경분만 수작업 이식**(아래 B2~B5).

### B2. build-report 확장 (`users/users.service.ts`) — 충돌 파일
- master의 현재 build-report(`astNodes` 저장 + payload 필수필드)를 **유지**하고,
- PR #37의 추가분만 이식: payload에서 `classMetrics`, `codeGraph` 구조분해 → `applyClassMetrics()` 호출 + `codeGraphService.ingest()` + `codeGraph.findings`에서 smells 파생.
- `users.module.ts`에 `CodeGraphService`/`ExamineService` 프로바이더 등록.

### B3. 메트릭 저장 (`ast-relational.service.ts`, `ast-class.entity.ts`) — 충돌 파일
- master의 임시 `computeMetrics`/`buildCkContext`/`collectClassNodes`(src/metric CK, 0 반환) **삭제**.
- PR #37의 `applyClassMetrics(manager, snapshotId, classMetrics[])` 이식 — `file::name` 키 매핑.
- `ast-class.entity.ts`의 `metrics` json 컬럼은 그대로 유지(양쪽 동일).

### B4. Jenkinsfile 분석 템플릿 v4 (`github/github.service.ts`) — 충돌 파일
- master의 현재 템플릿(tree-sitter zip → astNodes)을 **examine `/codegraph` 호출로 교체**:
  - zip → `POST $EXAMINE_URL/codegraph`(언어 라우팅) → `units/relations/findings` 수신
  - build-report payload에 `classMetrics`(units[].metrics에서 파생) + `codeGraph` 포함
- **동기화**: `docs/analysis-pipeline.Jenkinsfile`도 동일하게 갱신(절차 ⑤).
- 온보딩 강제주입 로직(master, 기존 sha 덮어쓰기)은 유지 — 템플릿 본문만 교체.

### B5. 온보딩/젠킨스 잡 (`onboarding.service.ts`, `jenkins.service.ts`) — 충돌 파일
- master의 최근 수정(github-credentials, `*/master` 브랜치스펙) **유지**.
- PR #37에 examine 관련 추가 배선이 있으면 그 부분만 병합(대개 언어감지/env 전달).

### B6. 환경변수 (`.env`, 배포 compose)
- 백엔드 `.env`에 `EXAMINE_PYTHON_URL`/`EXAMINE_C_URL`/`EXAMINE_JAVA_URL`/`EXAMINE_TS_URL` 추가(미설정 시 컨테이너명 기본값 사용).
- `code-graph`/`examine` 모듈이 `app.module.ts`에 등록됐는지 확인(TypeORM 엔티티 3종 포함).

**검증(green 기준)**: 백엔드 빌드 exit 0 · `EXAMINE_*_URL` override로 examine 컨테이너 도달 · 샘플 zip을 build-report로 POST → DB `ast_class.metrics` 실값 저장 확인 + `code_unit`/`code_relation`/`finding` 적재 확인.

---

## Phase C — 프론트 캐노니컬 컷오버
**왜**: 저장된 실측 metrics/findings를 화면에 렌더. master의 대시보드 그룹핑(프로젝트 탭 'P' 배지)은 유지.

- [ ] C1. 무충돌 신규 파일 가져오기: `CanonicalGraphView.tsx`, `codeGraphToFlow.ts`, `codeGraphAdapters.ts`, `codeGraphService.ts`, `codeGraph.interface.ts`.
- [ ] C2. 충돌 파일 이식(master 위): `useDashboardData.ts`(그룹핑 유지 + 캐노니컬 소스 추가), `DashboardPage.tsx`(스멜 요약 카드 `SmellSummarySection` 추가), `ast.interface.ts`, `api.ts`(envelope 인터셉터), `astDataService.ts`.
- [ ] C3. 4개 품질 카드가 `AstClass.metrics`/캐노니컬 metrics를 읽도록 배선(하드코딩 fallback 제거 또는 실측 우선).

**검증**: 온보딩→빌드→대시보드에서 4개 지표가 스냅샷마다 변동(고정값 아님) · 노드 상세 CK 패널 실값 · 스멜 배지/카드 표시 · 콘솔 에러 0.

---

## Phase D — 전체 e2e & 배포 마감
- [ ] D1. 노트북 서버에서 실 CI 1회: GitHub URL+PAT 온보딩 → Jenkins Job 자동생성 → examine `/codegraph` → build-report → DB → 대시보드 실측 렌더까지 원큐 통과.
- [ ] D2. 다국어 스모크: Python/Java/C/TS 각 1개 repo로 언어 라우팅 확인(C는 DIT/NOC N/A 정상).
- [ ] D3. 정리: 임시 `src/metric` CK 경로 잔재 제거 확인, `docs/` 로드맵·격차 문서 상태 갱신.
- [ ] D4. `feat/connect-examine` → master PR → 스쿼시 머지 → Deploy 파이프라인으로 배포.

**최종 완료 기준**: 배포된 `platform.refactory.store` 대시보드에서 실 repo 빌드 시 4개 지표가 실측값으로 뜨고, 빌드마다 값이 갱신된다.

---

## 리스크 & 미결정
- **R1. 컨테이너 리소스** — Java(JDK+Maven), C(libclang), TS(node) 이미지가 무거움 → 노트북 서버 메모리/디스크 확인 필요.
- **R2. 언어 감지** — zip 내 혼합 언어 repo의 라우팅 규칙(주 언어 1개? 파일별 분기?) — PR #37 `zip 언어 감지` 로직 검토 후 확정.
- **R3. Java/TS/C examine 완성도** — 문서상 Python 검증 완료, Java 40/48, C/TS 셋업 단계. 언어별 findings/metrics 커버리지 편차 있음(대시보드 표기 시 N/A 처리 필요).
- **R4. TypeORM synchronize** — 신규 엔티티 3종 추가 시 prod `synchronize:true` 의존. 로드맵의 `synchronize:false`+마이그레이션 전환은 별도 과제.
- **결정 필요**: Phase B 통합을 (a) 이 재적용 브랜치 방식으로 갈지, (b) PR #37을 현재 master로 rebase 재작성해 원 PR을 살릴지.
