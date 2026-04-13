import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { astDataService } from '../../services/test_astDataService';
import type { AstSnapshot } from '../../interface/ast.interface';
import type { FlowNodeData } from '../../interface/flow.interface';
import AstFlowCanvas, { type SearchAction, type SearchActionType, type SearchStatus } from '../../components/flow/AstFlowCanvas';
import shared from '../DashboardPage/dashboardShared.module.css';
import styles from './VisualizationPage.module.css';

export default function VisualizationPage() {
  const { snapshotId } = useParams<{ snapshotId: string }>();
  const [snapshot, setSnapshot] = useState<AstSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [nodeCount, setNodeCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchAction, setSearchAction] = useState<SearchAction | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({ query: '', matchCount: 0, activeIndex: 0 });

  useEffect(() => {
    if (!snapshotId || Number.isNaN(Number(snapshotId))) {
      setLoading(false);
      setError('스냅샷 ID가 올바르지 않습니다.');
      return;
    }
    setLoading(true);
    setError('');
    astDataService
      .getSnapshot(Number(snapshotId))
      .then(setSnapshot)
      .catch(() => setError('스냅샷 데이터를 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [snapshotId]);

  const handleNodeSelect = useCallback((data: FlowNodeData) => {
    setSelectedNode(data);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const nodeTypeLabel: Record<string, string> = {
    directory: '📁 디렉토리',
    file: '📄 파일',
    class: '🏛️ 클래스',
    function: '⚡ 함수',
  };

  const legend = [
    { color: '#3b82f6', label: '📁 디렉토리' },
    { color: '#10b981', label: '📄 파일' },
    { color: '#f59e0b', label: '🏛️ 클래스' },
    { color: '#a855f7', label: '⚡ 함수 / 메서드' },
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
          <Link
            to="/dashboard"
            className={`${shared.btnSecondary} ${styles.backBtn}`}
            onClick={(e) => e.stopPropagation()}
          >
            ← 대시보드
          </Link>
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
                <span className={styles.pill}>🔷 {nodeCount}</span>
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
                  onNodeSelect={(data) => {
                    if (data) handleNodeSelect(data);
                    else clearSelection();
                  }}
                  searchQuery={searchQuery}
                  searchAction={searchAction}
                  onSearchStatusChange={(s) => setSearchStatus(s)}
                  onGraphStatsChange={({ nodeCount: n }) => setNodeCount(n)}
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
