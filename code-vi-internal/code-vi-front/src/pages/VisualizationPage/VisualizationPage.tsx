import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { astDataService } from '../../services/astDataService';
import { toSmellFindings, type SmellFinding } from '../../utils/smellOverlay';
import type { AstSnapshot } from '../../interface/ast.interface';
import type { FlowNodeData } from '../../interface/flow.interface';
import AstFlowCanvas, { type SearchAction, type SearchActionType, type SearchStatus } from '../../components/flow/AstFlowCanvas';
import shared from '../DashboardPage/dashboardShared.module.css';
import styles from './VisualizationPage.module.css';

/* [임시-데모] dev에서 데모 URL(/visualization/:id?demo=1)로 직접 진입할 때만
   PrivateRoute(accessToken 검사) 통과용 가짜 토큰을 주입한다.
   무조건 주입하면 dev에서 비로그인 플로우·로그인 UI 테스트가 불가능해지므로
   데모 진입으로 스코프를 제한하고, 비데모 URL로 시작하면 남은 데모 토큰을 정리한다
   (SPA 내 이동은 아래 effect cleanup이, 전체 리로드는 여기가 담당). */
const DEMO_TOKEN = 'demo-local';
if (import.meta.env.DEV) {
  const isDemoEntry =
    window.location.pathname.includes('/visualization/') &&
    new URLSearchParams(window.location.search).get('demo') === '1';
  if (isDemoEntry && !localStorage.getItem('accessToken')) {
    localStorage.setItem('accessToken', DEMO_TOKEN);
  } else if (!isDemoEntry && localStorage.getItem('accessToken') === DEMO_TOKEN) {
    localStorage.removeItem('accessToken');
  }
}

export default function VisualizationPage() {
  const navigate = useNavigate();
  const { snapshotId } = useParams<{ snapshotId: string }>();
  const [searchParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState<AstSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [nodeCount, setNodeCount] = useState(0);
  const [totalNodeCount, setTotalNodeCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchAction, setSearchAction] = useState<SearchAction | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({ query: '', matchCount: 0, activeIndex: 0 });

  /* dev 전용 오버레이 UI 데모 — ?demo=1 로 명시적으로 진입 (예: /visualization/4?demo=1).
     snapshotId 매직 넘버로 가로채면 실 DB의 같은 ID 스냅샷을 dev에서 볼 수 없게 된다. */
  const isDemoSnapshot = import.meta.env.DEV && searchParams.get('demo') === '1';
  const [demoFindings, setDemoFindings] = useState<SmellFinding[] | null>(null);

  /* 스멜은 스냅샷 응답에 함께 실려 온다 — ast-relational이 같은 빌드의
     CodeAnalysis.pyExamineResult를 첨부하므로 별도 API 호출이 없다.
     스멜이 비어 있으면(분석 대상 아닌 언어 등) 오버레이는 자동으로 비활성. */
  const apiFindings = useMemo(
    () => (snapshot?.smells?.length ? toSmellFindings(snapshot.smells) : null),
    [snapshot]
  );
  const smellFindings = apiFindings ?? demoFindings;

  useEffect(() => {
    if (!snapshotId || Number.isNaN(Number(snapshotId))) {
      setLoading(false);
      setError('스냅샷 ID가 올바르지 않습니다.');
      return;
    }
    setLoading(true);
    setError('');
    setDemoFindings(null);

    if (import.meta.env.DEV && isDemoSnapshot) {
      // 더미 모듈은 모듈 최상위에서 트리·findings를 생성하는 부수효과가 있어
      // 정적 import하면 prod 번들에 포함되고 앱 시작 시 실행된다 — 반드시 여기서만 동적 import.
      Promise.all([
        import('../../services/test_astDataService'),
        import('../../dummy/smellDummyData'),
      ])
        .then(([demoService, demoSmells]) => {
          setDemoFindings(demoSmells.dummySmellFindings);
          return demoService.astDataService.getSnapshot(Number(snapshotId));
        })
        .then(setSnapshot)
        .catch(() => setError('스냅샷 데이터를 불러오는데 실패했습니다.'))
        .finally(() => setLoading(false));
      return;
    }

    astDataService
      .getSnapshot(Number(snapshotId))
      .then(setSnapshot)
      .catch(() => setError('스냅샷 데이터를 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [snapshotId, isDemoSnapshot]);

  /* 데모용 가짜 토큰은 페이지를 떠날 때 정리 — dev의 다른 플로우(비로그인 테스트 등)에 남지 않게.
     본문의 재주입은 StrictMode의 mount→cleanup→mount 시뮬레이션에서 토큰이 지워진 채
     남는 것을 막기 위함(모듈 최상위 주입은 최초 렌더 전 PrivateRoute 통과용). */
  useEffect(() => {
    if (import.meta.env.DEV && isDemoSnapshot && !localStorage.getItem('accessToken')) {
      localStorage.setItem('accessToken', DEMO_TOKEN);
    }
    return () => {
      if (import.meta.env.DEV && localStorage.getItem('accessToken') === DEMO_TOKEN) {
        localStorage.removeItem('accessToken');
      }
    };
  }, [isDemoSnapshot]);

  /* canvas에 넘기는 콜백은 identity를 고정해야 함 — 인라인으로 넘기면
     canvas 내부 effect가 매 렌더마다 재발화하며 무한 갱신 루프가 생긴다 */
  const handleCanvasNodeSelect = useCallback((data: FlowNodeData | null) => {
    setSelectedNode(data);
  }, []);

  const handleSearchStatusChange = useCallback((s: SearchStatus) => {
    setSearchStatus(s);
  }, []);

  const handleGraphStatsChange = useCallback(
    ({ nodeCount: n, totalNodeCount: t }: { nodeCount: number; totalNodeCount: number }) => {
      setNodeCount(n);
      setTotalNodeCount(t);
    },
    []
  );

  const nodeTypeLabel: Record<string, string> = {
    directory: '📁 디렉토리',
    file: '📄 파일',
    class: '🏛️ 클래스',
    function: '⚡ 함수',
  };

  const legend = [
    { color: '#60a5fa', label: '📁 디렉토리' },
    { color: '#34d399', label: '📄 파일' },
    { color: '#fbbf24', label: '🏛️ 클래스' },
    { color: '#c084fc', label: '⚡ 함수 / 메서드' },
    { color: '#f87171', label: 'High 스멜 (테두리)' },
    { color: '#fbbf24', label: 'Medium 스멜 (테두리)' },
  ];

  const stats = useMemo(() => {
    if (!snapshot) return null;
    return {
      dirCount: snapshot.directories.length,
      fileCount: snapshot.directories.reduce((acc, d) => acc + d.files.length, 0),
    };
  }, [snapshot]);

  useEffect(() => {
    setIsDetailOpen(Boolean(selectedNode));
  }, [selectedNode]);

  const triggerSearch = useCallback((type: SearchActionType) => {
    setSearchAction((prev) => ({ type, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.main}>
        <div className={`${styles.toolbar} ${snapshot ? styles.toolbarEmphasis : ''}`}>
          <button
            type="button"
            className={`${shared.btnSecondary} ${styles.backBtn}`}
            onClick={(e) => {
              e.stopPropagation();
              // 시각화는 워크스페이스의 코드 품질 뷰에서 진입하므로 히스토리로 복귀한다 —
              // URL 직접 진입 등 히스토리가 없으면 내 프로젝트 목록으로 보낸다.
              if (window.history.length > 1) navigate(-1);
              else navigate('/projects');
            }}
          >
            ← 대시보드
          </button>
          <div className={styles.toolbarCenter}>
            <span className={styles.toolbarKicker}>AST 시각화</span>
            <span className={styles.toolbarTitle}>Snapshot #{snapshotId}</span>
            {snapshot && (
              <span className={styles.toolbarMeta}>
                {new Date(snapshot.createdAt).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
          <div className={styles.toolbarRight}>
            {stats && (
              <div className={styles.pills} aria-label="스냅샷 요약">
                <span className={styles.pill}>📁 {stats.dirCount}</span>
                <span className={styles.pill}>📄 {stats.fileCount}</span>
                <span className={styles.pill} title="표시 중인 노드 / 전체 노드">
                  🔷 {nodeCount}/{totalNodeCount}
                </span>
              </div>
            )}
            <div className={styles.search} aria-label="노드 검색">
              <input
                type="search"
                className={styles.searchInput}
                placeholder="노드 이름·파일명…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') triggerSearch('focus');
                }}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => triggerSearch('prev')}
                disabled={!searchQuery.trim() || searchStatus.matchCount === 0}
                aria-label="이전 일치"
              >
                ◀
              </button>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => triggerSearch('next')}
                disabled={!searchQuery.trim() || searchStatus.matchCount === 0}
                aria-label="다음 일치"
              >
                ▶
              </button>
              <span className={styles.searchMeta} aria-live="polite">
                {searchQuery.trim()
                  ? searchStatus.matchCount
                    ? `${searchStatus.activeIndex + 1}/${searchStatus.matchCount}`
                    : '0/0'
                  : ''}
              </span>
            </div>

            <button
              type="button"
              className={`${styles.toolBtn} ${isDetailOpen ? styles.toolBtnActive : ''}`}
              onClick={() => setIsDetailOpen((v) => !v)}
              aria-label="상세 패널 토글"
              disabled={!selectedNode && !isDetailOpen}
              title={!selectedNode ? '노드를 선택하면 열 수 있어요' : ''}
            >
              상세
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <main className={styles.canvasWrap}>
            {loading ? (
              <div className={`${styles.center} ${styles.canvasFill}`}>
                <div className={styles.spinner} />
                <p className={styles.centerText}>스냅샷 데이터 로딩 중...</p>
              </div>
            ) : error ? (
              <div className={`${styles.center} ${styles.canvasFill}`}>
                <div className={styles.errorBox}>{error}</div>
              </div>
            ) : (
              <div className={styles.canvasFill}>
                <AstFlowCanvas
                  snapshot={snapshot}
                  onNodeSelect={handleCanvasNodeSelect}
                  searchQuery={searchQuery}
                  searchAction={searchAction}
                  onSearchStatusChange={handleSearchStatusChange}
                  onGraphStatsChange={handleGraphStatsChange}
                  smellFindings={smellFindings}
                />
              </div>
            )}
          </main>

          <aside className={`${styles.panelShell} ${isDetailOpen ? styles.panelShellOpen : ''}`}>
            <div className={`${shared.card} ${styles.panel}`}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>노드 상세</h3>
              </div>

              {selectedNode ? (
                <div className={styles.nodeDetail}>
                  <div className={styles.detailType}>
                    {nodeTypeLabel[selectedNode.nodeType] ?? selectedNode.nodeType}
                  </div>
                  <div className={styles.detailName}>{selectedNode.label}</div>

                  {selectedNode.meta && (
                    <div className={styles.detailMeta}>
                      {selectedNode.meta.startLine != null && (
                        <div className={styles.metaRow}>
                          <span className={styles.metaKey}>위치</span>
                          <span className={styles.metaVal}>
                            L{selectedNode.meta.startLine} → L{selectedNode.meta.endLine}
                          </span>
                        </div>
                      )}
                      {selectedNode.meta.methodCount != null && (
                        <div className={styles.metaRow}>
                          <span className={styles.metaKey}>메서드 수</span>
                          <span className={styles.metaVal}>{selectedNode.meta.methodCount}</span>
                        </div>
                      )}
                      {selectedNode.meta.fileCount != null && (
                        <div className={styles.metaRow}>
                          <span className={styles.metaKey}>파일 수</span>
                          <span className={styles.metaVal}>{selectedNode.meta.fileCount}</span>
                        </div>
                      )}
                      {selectedNode.meta.childDirCount != null && (
                        <div className={styles.metaRow}>
                          <span className={styles.metaKey}>하위 디렉토리</span>
                          <span className={styles.metaVal}>{selectedNode.meta.childDirCount}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNode.nodeType === 'class' && selectedNode.metrics && (
                    <div className={styles.metricsDetail}>
                      <div className={styles.metricsSectionTitle}>CK Software Metrics</div>
                      <div className={styles.detailMeta}>
                        <div className={styles.metaRow} title="Coupling Between Objects: 클래스 간 결합도">
                          <span className={styles.metaKey}>CBO</span>
                          <span className={styles.metaVal}>{selectedNode.metrics.cbo}</span>
                        </div>
                        <div className={styles.metaRow} title="Response For a Class: 클래스 응답 집합">
                          <span className={styles.metaKey}>RFC</span>
                          <span className={styles.metaVal}>{selectedNode.metrics.rfc}</span>
                        </div>
                        <div className={styles.metaRow} title="Lack of Cohesion in Methods: 메서드 응집도 부족">
                          <span
                            className={`${styles.metaKey} ${selectedNode.metrics.lcom > 50 ? styles.warn : ''}`}
                          >
                            LCOM
                          </span>
                          <span className={styles.metaVal}>{selectedNode.metrics.lcom}</span>
                        </div>
                        <div className={styles.metaRow} title="Weighted Methods per Class: 클래스 당 가중 메서드 (복잡도)">
                          <span className={styles.metaKey}>WMC</span>
                          <span className={styles.metaVal}>{selectedNode.metrics.wmc}</span>
                        </div>
                        <div className={styles.metaRow} title="Depth of Inheritance Tree: 상속 계층 깊이">
                          <span className={styles.metaKey}>DIT</span>
                          <span className={styles.metaVal}>{selectedNode.metrics.dit}</span>
                        </div>
                        <div className={styles.metaRow} title="Number of Children: 자식 클래스 수">
                          <span className={styles.metaKey}>NOC</span>
                          <span className={styles.metaVal}>{selectedNode.metrics.noc}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(selectedNode.qualityScore != null || (selectedNode.smells && selectedNode.smells.total > 0)) && (
                    <div className={styles.metricsDetail}>
                      <div className={styles.metricsSectionTitle}>코드 스멜 · 품질</div>
                      <div className={styles.detailMeta}>
                        {selectedNode.qualityScore != null && (
                          <div className={styles.metaRow} title="파일: 100 - high×10 - medium×3 / 디렉토리: 하위 파일 평균">
                            <span className={styles.metaKey}>품질 점수</span>
                            <span className={styles.metaVal}>{selectedNode.qualityScore}점</span>
                          </div>
                        )}
                        {selectedNode.smells && selectedNode.smells.total > 0 && (
                          <>
                            <div className={styles.metaRow}>
                              <span className={styles.metaKey}>High / Medium</span>
                              <span className={styles.metaVal}>
                                {selectedNode.smells.high} / {selectedNode.smells.medium}
                              </span>
                            </div>
                            <div className={styles.metaRow}>
                              <span className={styles.metaKey}>검출 룰</span>
                              <span className={styles.metaVal}>{selectedNode.smells.names.join(', ')}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.panelEmpty}>
                  <span>노드를 클릭하면</span>
                  <span>상세 정보가 표시됩니다.</span>
                </div>
              )}

              <div className={`${styles.legend} ${isLegendOpen ? '' : styles.legendCollapsed}`}>
                <div className={styles.legendHeaderRow}>
                  <div className={styles.legendTitle}>범례</div>
                  <button
                    type="button"
                    className={styles.legendToggle}
                    onClick={() => setIsLegendOpen((v) => !v)}
                    aria-label="범례 토글"
                  >
                    {isLegendOpen ? '숨기기' : '보기'}
                  </button>
                </div>
                {legend.map(({ color, label }) => (
                  <div key={label} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: color }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
