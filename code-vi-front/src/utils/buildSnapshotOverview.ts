import type { AstClass, AstFile, AstFunction, AstSnapshot } from '../interface/ast.interface';
import type {
  MetricStatus,
  QualityMetricCardData,
  RadarAxisData,
  RefactoringSuggestion,
  SnapshotOverview,
} from '../interface/dashboardOverview.interface';

function isArtifactClass(c: AstClass): boolean {
  return c.name === 'class';
}

function fnLoc(f: AstFunction): number {
  return Math.max(0, f.endLine - f.startLine + 1);
}

function collectFromFile(
  file: AstFile,
  out: {
    files: number;
    functions: AstFunction[];
    classes: AstClass[];
    totalLoc: number;
  }
) {
  out.files += 1;
  out.totalLoc += Math.max(0, file.fileFunctions.reduce((s, f) => s + fnLoc(f), 0));
  for (const fn of file.fileFunctions) {
    out.functions.push(fn);
  }
  for (const cls of file.classes) {
    if (isArtifactClass(cls)) continue;
    out.classes.push(cls);
    for (const m of cls.methods) {
      out.functions.push(m);
      out.totalLoc += fnLoc(m);
    }
  }
}

function statusFromScore(score: number): MetricStatus {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'maintain';
  return 'danger';
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** CK 기반 휴리스틱 유지보수성 (0–100, 높을수록 좋음) */
function heuristicMI(avgCbo: number, avgWmc: number, avgLcom: number): number {
  const raw =
    100 -
    Math.min(40, avgCbo * 4) -
    Math.min(35, avgWmc * 2.2) -
    Math.min(30, (avgLcom / 100) * 30);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function complexityScore(avgWmc: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - avgWmc * 5.5)));
}

function variableCohesionScore(avgLcom: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - avgLcom * 0.85)));
}

function dependencyStabilityScore(avgCbo: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - avgCbo * 12)));
}

function qualityHintFromScore(score: number): string {
  if (score >= 80) return '전반적인 코드 품질이 양호합니다. 소수 영역만 점검하면 좋습니다.';
  if (score >= 65) return '전체적인 코드 품질은 양호하나, 일부 개선이 필요합니다.';
  if (score >= 45) return '구조적 부채가 누적된 구간이 있습니다. 리팩토링 우선순위를 정하는 것을 권장합니다.';
  return '품질 지표가 다소 낮습니다. 결합도·복잡도 중심으로 점검이 필요합니다.';
}

function buildRefactorings(classes: AstClass[]): RefactoringSuggestion[] {
  const items: RefactoringSuggestion[] = [];
  let idx = 0;
  for (const cls of classes) {
    const m = cls.metrics;
    if (!m) continue;
    if (m.lcom <= 50 && m.cbo <= 6 && m.wmc <= 12) continue;
    idx += 1;
    const detail =
      m.lcom > 50
        ? 'LCOM이 높아 클래스 내 메서드가 서로 다른 데이터를 다루는 경향이 있습니다. 응집도를 높이기 위해 역할을 분리하세요.'
        : m.cbo > 6
          ? '다른 클래스와의 결합(CBO)이 높습니다. 의존 방향을 줄이거나 중재 레이어를 도입하는 것을 검토하세요.'
          : '메서드 수·복잡도(WMC)가 큽니다. 긴 메서드 분할과 단일 책임 원칙 적용을 권장합니다.';
    const summary =
      m.lcom > 50
        ? `응집도 저하: ${cls.name}에서 LCOM이 높습니다.`
        : m.cbo > 6
          ? `결합 과다: ${cls.name}의 CBO가 높습니다.`
          : `복잡도 과다: ${cls.name}의 WMC가 큽니다.`;
    const effect =
      m.lcom > 50
        ? '역할 분리 시 변경 범위 축소·테스트 용이성 향상을 기대할 수 있습니다.'
        : m.cbo > 6
          ? '의존 축소 시 리그레션 범위와 배포 리스크를 줄일 수 있습니다.'
          : '메서드 분할 시 가독성과 단위 테스트 작성이 쉬워집니다.';
    const severity = m.wmc > 16 || m.cbo > 9 || m.lcom > 70 ? 'risk' : 'improve';
    const effectHighlights = effect
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    items.push({
      id: `rf-${cls.id}-${idx}`,
      targetLabel: cls.name,
      problemSummary: summary,
      problemCode: `// ${cls.name}: LCOM ${m.lcom}, CBO ${m.cbo}, WMC ${m.wmc}\n// 높은 결합·응집도 저하 가능성`,
      improvedCode: `// 책임 분리 또는 서비스 추출로 메서드 그룹을 나눕니다.\n// private 헬퍼 추출, 인터페이스 도입 검토`,
      effectSummary: effect,
      detailExplanation: detail,
      severity,
      effectHighlights,
    });
    if (items.length >= 4) break;
  }
  if (items.length === 0) {
    items.push({
      id: 'rf-placeholder',
      targetLabel: '전체 스냅샷',
      problemSummary: '자동 탐지된 고위험 클래스가 없습니다.',
      problemCode: '// 현재 스냅샷에서 자동 탐지된 고위험 클래스가 없습니다.',
      improvedCode: '// 상세 다이어그램에서 노드를 선택해 메트릭을 확인하세요.',
      effectSummary: '현재 스냅샷은 CK 기준 허용 범위 내로 보입니다.',
      detailExplanation:
        '지표가 허용 범위 내입니다. 새 코드 추가 시에도 동일 기준을 유지하는 것이 좋습니다.',
      severity: 'clear',
      effectHighlights: ['허용 범위'],
    });
  }
  return items;
}

/**
 * 스냅샷 AST로부터 대시보드 overview 생성 (순수 함수, 백엔드 전용 API로 대체 가능)
 */
export function buildSnapshotOverview(snapshot: AstSnapshot): SnapshotOverview {
  const dirs = snapshot.directories ?? [];
  const state = {
    files: 0,
    functions: [] as AstFunction[],
    classes: [] as AstClass[],
    totalLoc: 0,
  };
  for (const d of dirs) {
    for (const f of d.files) {
      collectFromFile(f, state);
    }
  }

  const fileCount = state.files;
  const functionCount = state.functions.length;
  const classCount = state.classes.length;
  const avgFunctionLoc =
    functionCount > 0 ? Math.round((state.totalLoc / functionCount) * 10) / 10 : 0;

  const classesWithMetrics = state.classes.filter((c) => c.metrics);
  const cbos = classesWithMetrics.map((c) => c.metrics!.cbo);
  const wmcs = classesWithMetrics.map((c) => c.metrics!.wmc);
  const lcoms = classesWithMetrics.map((c) => c.metrics!.lcom);

  const avgCbo = avg(cbos);
  const avgWmc = avg(wmcs);
  const avgLcom = avg(lcoms);

  const mi = heuristicMI(avgCbo, avgWmc, avgLcom);
  const scComplexity = complexityScore(avgWmc || 3);
  const scVar = variableCohesionScore(avgLcom || 30);
  const scDep = dependencyStabilityScore(avgCbo || 2);
  const scMaintain = mi;

  const qualityScore = Math.round((scComplexity + scVar + scDep + scMaintain) / 4);

  const astNodeCount = Math.round(
    fileCount * 48 + functionCount * 22 + classCount * 28 + (snapshot.methodCalls?.length ?? 0) * 3
  );

  const analysisSeconds =
    Math.round(Math.max(0.08, fileCount * 0.04 + functionCount * 0.02) * 100) / 100;

  const totalLoc = state.totalLoc || fileCount * 40;

  const locRadar = Math.max(0, Math.min(100, 100 - Math.min(100, (totalLoc / 4000) * 100)));
  const cycloRadar = Math.max(0, Math.min(100, 100 - Math.min(100, avgWmc * 7)));
  const cboRadar = Math.max(0, Math.min(100, 100 - Math.min(100, avgCbo * 14)));
  const wmcRadar = Math.max(0, Math.min(100, 100 - Math.min(100, avgWmc * 6)));
  const miRadar = mi;

  const radarAxes: RadarAxisData[] = [
    {
      subject: 'LOC',
      fullMark: 100,
      value: Math.round(locRadar),
      hint: '코드 규모(라인)가 클수록 이해·테스트 비용이 커질 수 있습니다. 높은 점수는 상대적으로 안정적 규모를 뜻합니다.',
    },
    {
      subject: '복잡도(∝WMC)',
      fullMark: 100,
      value: Math.round(cycloRadar),
      hint: 'WMC를 복잡도 대용으로 요약한 값입니다. 실제 Cyclomatic Complexity와는 다를 수 있습니다.',
    },
    {
      subject: 'CBO',
      fullMark: 100,
      value: Math.round(cboRadar),
      hint: '클래스 간 결합(Coupling Between Objects). 낮은 결합은 변경 파급을 줄이는 데 유리합니다.',
    },
    {
      subject: 'WMC',
      fullMark: 100,
      value: Math.round(wmcRadar),
      hint: '클래스당 가중 메서드 수. 메서드가 많고 무거울수록 유지보수 부담이 커질 수 있습니다.',
    },
    {
      subject: '유지보수성(MI)',
      fullMark: 100,
      value: Math.round(miRadar),
      hint: 'CK 지표 조합 휴리스틱 MI. 높을수록 구조적 부담이 상대적으로 작다고 볼 수 있습니다.',
    },
  ];

  const metricCards: QualityMetricCardData[] = [
    {
      id: 'complexity',
      title: '함수·클래스 복잡도',
      description: 'WMC 기반 복잡도 추정\n낮을수록 테스트·변경에 유리',
      score: scComplexity,
      maxScore: 100,
      status: statusFromScore(scComplexity),
      accent: 'rose',
    },
    {
      id: 'cohesion',
      title: '응집·변수 관리',
      description: 'LCOM 기반 응집도 힌트\n낮을수록 같은 상태를 공유',
      score: scVar,
      maxScore: 100,
      status: statusFromScore(scVar),
      accent: 'amber',
    },
    {
      id: 'coupling',
      title: '의존성 안정성',
      description: 'CBO(클래스 간 결합)\n낮을수록 변경 파급이 감소',
      score: scDep,
      maxScore: 100,
      status: statusFromScore(scDep),
      accent: 'sky',
    },
    {
      id: 'maintainability',
      title: '유지보수성 지수',
      description: 'CK 지표 조합 휴리스틱\n실제 MI와 다를 수 있음',
      score: scMaintain,
      maxScore: 100,
      status: statusFromScore(scMaintain),
      accent: 'emerald',
    },
  ];

  return {
    snapshotId: snapshot.id,
    teamProjectId: snapshot.teamProjectId,
    analyzedAt: snapshot.createdAt,
    qualityScore,
    qualityHint: qualityHintFromScore(qualityScore),
    astSummary: {
      fileCount,
      functionCount,
      astNodeCount,
      avgFunctionLoc,
      analysisSeconds,
    },
    metricCards,
    radarAxes,
    refactorings: buildRefactorings(state.classes),
  };
}
