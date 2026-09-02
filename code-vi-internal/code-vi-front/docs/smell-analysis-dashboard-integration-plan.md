# Smell Analysis Dashboard Integration Plan

이 문서는 CodeVi 프론트엔드 `/dashboard` 화면에 `advanced-pyexamine` 기반 코드 스멜 분석 결과를 연동하기 위한 구현 계획이다.

현재 목표는 기존 대시보드 레이아웃을 크게 바꾸지 않고, SonarQube 기반 품질 점수와 분리된 별도 섹션으로 코드 스멜 결과를 보여주는 것이다.

## 1. 연동 대상 화면

대상 화면은 CodeVi 내부 프론트의 dashboard 화면이다.

```text
src/pages/DashboardPage/DashboardPage.tsx
```

현재 화면 구조는 다음과 같다.

```text
DashboardPage
  Header
  Code Insight Overview intro card
  SnapshotStrip
  QualitySummaryRow
  QualityMetricCards
  MetricsRadarSection
  DiagramPreviewSection
  RefactoringSection
```

코드 스멜 분석 섹션은 기존 품질 점수 영역 아래에 추가한다.

```text
DashboardPage
  Header
  Code Insight Overview intro card
  SnapshotStrip
  QualitySummaryRow
  QualityMetricCards
  MetricsRadarSection
  DiagramPreviewSection
  RefactoringSection
  AdvancedPyexamineSmellSection   <- 신규 추가
```

## 2. 왜 기존 카드에 바로 섞지 않는가

SonarQube와 advanced-pyexamine은 분석 목적이 다르다.

| 구분 | 역할 |
| --- | --- |
| SonarQube | bugs, vulnerabilities, code smells, maintainability rating 등 품질 메트릭 중심 |
| advanced-pyexamine | Python AST 기반 smell detector 결과 중심 |

따라서 1차 연동에서는 품질 점수 계산에 바로 반영하지 않고, `Advanced PyExamine 코드 스멜 분석` 별도 섹션으로 노출한다.

추후 팀 합의 후 다음 확장이 가능하다.

- 기존 quality score 계산에 smell severity 반영
- build snapshot과 smell analysis job을 1:1로 연결
- SonarQube code smell과 advanced-pyexamine smell을 통합 표시

## 3. 사용할 Backend API

Backend API 계약은 `code-vi-internal/code-vi-back/docs/smell-analysis-frontend-contract.md` 기준으로 사용한다.

### 최신 분석 목록 조회

```http
GET /api/smell-analyses?teamProjectId={teamProjectId}&status=SUCCESS&limit=1&offset=0
```

용도:

- 현재 프로젝트의 최신 successful smell analysis job 확인
- `jobId`, `summaryTotal`, `summaryBySeverity`, `completedAt` 확보

### 분석 상세 조회

```http
GET /api/smell-analyses/{jobId}
```

용도:

- summary 전체 조회
- `summary.byName` 기반 rule breakdown 표시
- 초기 상세 findings 확인

### Finding 목록 조회

```http
GET /api/smell-analyses/{jobId}/findings?limit=20&offset=0
```

용도:

- findings 테이블 표시
- severity/name/filePath 필터 연동
- pagination 연동

## 4. 프론트 신규 파일 계획

### API client

```text
src/services/smellAnalysisService.ts
```

역할:

- smell-analysis backend API 호출 함수 제공
- axios 인스턴스는 기존 `src/services/api.ts` 재사용

예상 함수:

```ts
listSmellAnalyses(params)
getSmellAnalysis(jobId)
listSmellFindings(jobId, params)
```

### 타입 정의

```text
src/interface/smellAnalysis.interface.ts
```

역할:

- API 응답 타입 정의
- dashboard 컴포넌트 props 타입 공유

주요 타입:

```ts
SmellAnalysisListItem
SmellAnalysisDetail
SmellAnalysisFinding
SmellAnalysisFindingsResponse
SmellSummary
```

### Dashboard hook

```text
src/hooks/useSmellAnalysisData.ts
```

역할:

- 현재 `teamProjectId` 기준 최신 smell analysis 조회
- 최신 `jobId` 기준 detail/finding 조회
- loading/error/empty 상태 관리
- severity 필터와 pagination 상태 관리

### Dashboard section component

```text
src/pages/DashboardPage/components/AdvancedPyexamineSmellSection.tsx
src/pages/DashboardPage/components/AdvancedPyexamineSmellSection.module.css
```

역할:

- summary 카드 표시
- severity/rule breakdown 표시
- findings 테이블 표시
- 빈 상태와 실패 상태 표시

## 5. 기존 파일 수정 계획

### `DashboardPage.tsx`

수정 내용:

- `AdvancedPyexamineSmellSection` import
- `overview?.teamProjectId` 또는 snapshot의 `teamProjectId`를 섹션에 전달
- 기존 `sections` 영역 하단에 신규 섹션 렌더링

예상 위치:

```tsx
{overview && selectedId != null && (
  <div className={styles.sections}>
    <QualitySummaryRow ... />
    <QualityMetricCards ... />
    <MetricsRadarSection ... />
    <DiagramPreviewSection ... />
    <RefactoringSection ... />
    <AdvancedPyexamineSmellSection teamProjectId={overview.teamProjectId} />
  </div>
)}
```

### CSS

기존 `DashboardPage` 스타일과 맞춰 카드형 섹션으로 추가한다.

주의사항:

- 기존 카드 안에 다시 큰 카드 중첩을 만들지 않는다.
- dashboard가 어두운 테마이므로 기존 module css의 색상 토큰과 border 스타일을 재사용한다.
- 모바일에서는 table이 깨지지 않도록 horizontal scroll 또는 compact layout을 둔다.

## 6. 화면 표시 항목

### Summary 영역

| UI Label | API Field |
| --- | --- |
| 전체 스멜 | `summary.total` 또는 `summaryTotal` |
| High | `summary.bySeverity.high` |
| Medium | `summary.bySeverity.medium` |
| 분석 도구 | `analyzer` |
| 분석 완료 | `completedAt` |

### Rule breakdown

`summary.byName`을 사용한다.

예시:

```json
{
  "long_method": 41,
  "data_clumps": 2
}
```

표시:

```text
Long Method  41
Data Clumps   2
```

### Findings table

| Column | API Field |
| --- | --- |
| Rule | `name` |
| Severity | `severity` |
| File | `filePath` |
| Line | `lineStart`, `lineEnd` |
| Entity | `entity` |
| Message | `message` |

## 7. 상태 처리

### Loading

표시 조건:

- 최신 smell analysis 목록 조회 중
- detail/finding 조회 중

UI:

```text
코드 스멜 분석 결과를 불러오는 중...
```

### Empty

표시 조건:

- `GET /api/smell-analyses` 결과가 빈 배열

UI:

```text
아직 저장된 코드 스멜 분석 결과가 없습니다.
```

### Failed job

표시 조건:

- 최신 job이 `FAILED`이거나 detail에 `errorCode`, `errorMessage`가 존재

UI:

```text
최근 코드 스멜 분석이 실패했습니다.
ANALYZER_SERVICE_FAILED: ...
```

### Unauthorized

기존 `api.ts` interceptor가 401에서 로그인 페이지로 이동하므로 별도 구현은 최소화한다.

## 8. 1차 구현 범위

이번 프론트 1차 작업에서는 다음까지만 구현한다.

- 최신 successful smell analysis 조회
- summary 카드 표시
- severity/rule breakdown 표시
- findings table 표시
- severity 필터: All / High / Medium
- findings pagination: `limit=20`, `offset` 기반 이전/다음
- loading/empty/error 상태 표시

이번 범위에서 제외한다.

- smell analysis 실행 버튼
- projectPath 입력 UI
- SonarQube quality score와 smell score 통합
- build snapshot별 자동 smell job 생성
- finding 상세 모달

## 9. 구현 순서

1. `smellAnalysis.interface.ts` 추가
2. `smellAnalysisService.ts` 추가
3. `useSmellAnalysisData.ts` 추가
4. `AdvancedPyexamineSmellSection.tsx` 추가
5. `AdvancedPyexamineSmellSection.module.css` 추가
6. `DashboardPage.tsx`에 섹션 연결
7. `npm run build`로 타입 검증
8. 로컬 `/dashboard`에서 화면 확인

## 10. 검증 계획

### Backend 사전 조건

CodeVi backend와 advanced-pyexamine-service가 실행 중이어야 한다.

```text
CodeVi backend: http://localhost:13000
advanced-pyexamine-service: Docker network shared-net 내부 advanced-pyexamine-service:18080
```

### 데이터 사전 조건

최소 한 번 이상 smell analysis가 저장되어 있어야 한다.

이미 검증된 저장 예시:

```text
teamProjectId=1
language=python
analyzer=advanced_pyexamine
summary.total=43
summary.byName.long_method=41
summary.byName.data_clumps=2
```

### 프론트 확인 항목

- `/dashboard` 진입 시 기존 영역이 깨지지 않는다.
- 코드 스멜 섹션이 기존 `RefactoringSection` 아래에 표시된다.
- 전체 smell count가 backend 결과와 일치한다.
- High/Medium count가 backend 결과와 일치한다.
- Rule breakdown이 표시된다.
- findings table이 표시된다.
- severity 필터를 눌렀을 때 API query가 바뀐다.
- 결과가 없는 경우 empty state가 표시된다.

## 11. PR 설명 기준

PR에는 다음을 포함한다.

```md
## 작업 내용

- Dashboard에 advanced-pyexamine 코드 스멜 분석 섹션 추가
- smell-analysis API client 및 타입 정의 추가
- 최신 smell analysis summary/finding 조회 연동
- severity 필터와 findings pagination 추가

## 검증

- npm run build 통과
- /dashboard 로컬 화면 확인
- 저장된 smell-analysis job 기준 summary/finding 렌더링 확인

## 비고

- 이번 PR에서는 분석 실행 버튼은 포함하지 않음
- SonarQube 품질 점수와 advanced-pyexamine 결과는 별도 섹션으로 분리 표시
```
