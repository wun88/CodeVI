# PR #36 분석 + MCP 백엔드 엔드포인트 구현 계획안 (정정본)

> **정정**: 초판에서 PR #36을 "L1 MCP서버 / L2 smell-analysis / L3 transformer"로 나눴는데 이는 틀린 프레이밍이었다.
> 실제로 **MCP 서버는 별도 레포**(`Jeon-byeong-yoon/code-smell-detection-mcp`)이고, PR #36의 본질은
> **그 MCP 서버가 프록시로 호출할 엔드포인트를 CodeVi 백엔드에 만드는 것**이다.

---

## Part 1 — 실제 아키텍처 (검증 완료)

MCP 서버(별도 레포)는 CodeVi 백엔드 안의 옛 `src/mcp/codevi-metrics-server.ts`를 **독립 stdio 서버로 리팩터**한 것이다(README 명시). 자체적으로 `advanced_pyexamine`을 실행해 스멜을 탐지하고, 결과 저장·조회는 **CodeVi 백엔드 REST API로 프록시**한다.

```
MCP 클라이언트(Claude/Cursor)
  → code-smell-detection-mcp (별도 레포, stdio)
      → advanced_pyexamine 실행 (스멜 탐지)
      → CodeVi 백엔드 REST 프록시 (저장/조회)  ← PR #36이 만드는 부분
```

### MCP 서버가 호출하는 백엔드 계약 (client 코드에서 직접 확인)
| MCP client | 호출 경로 | env | 우리 백엔드 |
|---|---|---|---|
| `smell-analysis-client` | `POST /smell-analyses`, `GET /smell-analyses`, `GET /smell-analyses/:id`, `GET /smell-analyses/:id/findings` | `SMELL_ANALYSIS_API_BASE_URL=…/api` | **없음** ⭐ |
| `code-analysis-client` | `GET /api/code-analysis` | `ANALYSIS_API_BASE_URL` | 있음(`getDashboardData`) |
| `metrics-client` | `POST/GET /analyses`, `GET /analyses/:id` | `METRICS_API_BASE_URL` | 있음(`@Controller('analyses')`) |

→ **MCP 서버가 붙기 위해 백엔드에 없는 유일한 조각 = `/api/smell-analyses` (smell-analysis 도메인)**.
그리고 그게 정확히 **PR #36의 `src/smell-analysis/**` 모듈**이다.

### smell-analysis를 별도 도메인으로 만든 이유 (MCP 레포 contract 문서)
- metric-analysis(정량 지표)와 pyexamine 스멜(rule별 목록·severity·위치·message)은 스키마 변경주기·크기가 달라 분리 권장.
- 공통 식별자(`teamProjectId/buildNumber/commitHash`)만 공유, 상세는 별도 job/finding으로.

---

## Part 2 — 무엇을 가져오고 무엇을 버리나

**PR #36 = 백엔드 엔드포인트 작업.** MCP 목표 기준으로 선별:

| PR #36 요소 | 처리 | 이유 |
|---|---|---|
| `src/smell-analysis/**` (`/api/smell-analyses` 모듈) | **이식 ⭐** | MCP `smell-analysis-client`가 호출하는 유일한 미존재 엔드포인트 |
| `pyexamine-result-item.dto.ts` + nested validation | **이식** | 저장 payload 검증(PR #36 "다음 작업") |
| `src/mcp/codevi-metrics-server.ts` (in-repo MCP) | **버림** | 외부 레포가 대체(README 명시) |
| `pyexamine-transformer.ts` + CLI (L3) | **버림** | MCP 레포가 자체 pyexamine 실행; examine도 스멜 생성 |
| `code-analysis` 조회 | 확인만 | `GET /api/code-analysis` 이미 존재 (pyExamineResult 반환 여부 검증) |
| docs codex_17~25 | 참고/정리 | 스펙 문서 |

### 병합된 PR #37(examine)과의 관계
- examine은 `findings → CodeAnalysis.pyExamineResult`(GET /api/code-analysis로 조회)에 스멜 적재.
- smell-analysis 도메인은 **별도 저장소**(SmellAnalysisJob/Finding), MCP가 advanced_pyexamine로 탐지한 결과를 저장.
- 둘은 **공존**(서로 다른 소스/스키마). MCP의 code-analysis 조회 도구는 examine 데이터를, smell-analyses 도구는 MCP 저장 데이터를 본다.

---

## Part 3 — 구현 계획

### Phase S1 — smell-analysis 모듈 이식 (핵심)
- `src/smell-analysis/**` 통째 이식 (controller/service/module/entities/dto/guard).
- 의존성: `ApiKeyModule`, `UsersModule`, `TeamProject`(모두 master에 존재) — import 확인.
- `app.module.ts`에 `SmellAnalysisModule` 등록.
- `pyexamine-result-item.dto.ts` + `create-code-analysis.dto.ts`의 nested validation 이식.
- TypeORM synchronize가 `smell_analysis_job`/`smell_analysis_finding` 테이블 자동 생성.

### Phase S2 — 계약 정합 검증
- MCP `smell-analysis-client`의 요청 DTO ↔ 백엔드 `CreateSmellAnalysisRequestDto` 필드 일치 확인.
- 응답 envelope(`{success,data}`)를 MCP client가 언랩하는 방식과 일치 확인.
- 인증: 가드 `SmellAnalysisJwtOrApiKeyGuard`(JWT 또는 API 키). MCP는 `SMELL_ANALYSIS_API_KEY` Bearer → api-key 발급 경로 확인.

### Phase S3 — 빌드/배포
- 백엔드 빌드(nest build) → 재배포. 신규 테이블 생성 확인.
- (선택) `code-analysis` 조회가 pyExamineResult를 반환하도록 필요시 보강.

### Phase S4 — e2e
- 직접: `POST /api/smell-analyses`(샘플 payload) → `GET /:id/findings` 조회 확인 (백엔드 단독).
- 통합: MCP 레포를 `SMELL_ANALYSIS_API_BASE_URL=https://backend.refactory.store/api`로 설정 → `analyze_python_smells` → 저장 → 조회까지.

---

## 결정 필요
1. **범위**: smell-analysis 모듈만(권장) vs code-analysis 조회 보강까지.
2. **인증**: `/api/smell-analyses`에 API 키 필수 vs 내부 오픈. (MCP가 외부 도구라 API 키 권장)
3. **충돌 파일**: package.json/docker-compose/Jenkins-Dockerfile 변경은 transformer/MCP-build용이라 **스킵**(smell-analysis만 가져오면 app.module만 건드림).

## 리스크
- **R1**: MCP client의 요청/응답 DTO와 PR #36 백엔드 DTO가 실제로 1:1인지 미검증(레포가 각자 진화). Phase S2에서 필드 대조 필수.
- **R2**: api-key 발급/검증 흐름(가드가 기대하는 헤더·키 포맷)이 MCP client의 Bearer와 맞는지 확인.
