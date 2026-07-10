import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { useDashboardData } from '../../hooks/useDashboardData';
import DiagramPreviewSection from './components/DiagramPreviewSection';
import MetricsRadarSection from './components/MetricsRadarSection';
import QualityMetricCards from './components/QualityMetricCards';
import QualitySummaryRow from './components/QualitySummaryRow';
import RefactoringSection from './components/RefactoringSection';
import SnapshotStrip from './components/SnapshotStrip';
import styles from './DashboardPage.module.css';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    projects,
    selectedProjectId,
    selectProject,
    snapshots,
    selectedId,
    selectSnapshot,
    overview,
    listLoading,
    detailLoading,
    error,
  } = useDashboardData();

  const teamName = useMemo(() => readStored('cv_teamName') ?? '분석 워크스페이스', []);
  const projectName = useMemo(
    () => projects.find((p) => p.teamProjectId === selectedProjectId)?.name ?? '프로젝트',
    [projects, selectedProjectId]
  );

  const analyzedAtLabel = overview
    ? new Date(overview.analyzedAt).toLocaleString('ko-KR')
    : '—';

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/login');
  };

  return (
    <div className={`${styles.shell} dashboard-page`}>
      <Header onLoginClick={() => navigate('/login')} onLogout={handleLogout} variant="internal" />
      <div className={styles.inner}>
        <section className={styles.introCard}>
          <div className={styles.introLeft}>
            <div className={styles.introKicker}>Dashboard</div>
            <div className={styles.introTitle}>Code Insight Overview</div>
            <div className={styles.introMeta}>
              <span className={styles.metaChip}>{teamName}</span>
              <span className={styles.metaDot} aria-hidden>
                ·
              </span>
              <span className={styles.metaProject}>{projectName}</span>
            </div>
          </div>
          <div className={styles.introRight}>
            <div className={styles.introStat}>
              <div className={styles.introStatLabel}>최근 분석 기준</div>
              <div className={styles.introStatVal}>{analyzedAtLabel}</div>
            </div>
          </div>
        </section>

        {listLoading && (
          <div className={styles.loadingBlock}>
            <div className={styles.spinner} />
            <p>스냅샷 목록을 불러오는 중…</p>
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}

        {!listLoading && !error && projects.length === 0 && (
          <div className={styles.emptyCard}>
            <span className={styles.emptyIcon} aria-hidden>
              📭
            </span>
            <p className={styles.emptyTitle}>등록된 스냅샷이 없습니다.</p>
            <p className={styles.emptyHint}>Jenkins 파이프라인을 실행하면 스냅샷이 생성됩니다.</p>
          </div>
        )}

        {!listLoading && projects.length > 0 && (
          <>
            {/* 프로젝트 선택 — 프로젝트 단위로 분류 후, 아래에서 해당 프로젝트의 빌드 스냅샷 선택 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '2px 0' }}>
              {projects.map((p) => {
                const active = p.teamProjectId === selectedProjectId;
                return (
                  <button
                    key={p.teamProjectId}
                    type="button"
                    onClick={() => selectProject(p.teamProjectId)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: `1px solid ${active ? '#6366f1' : '#2d3150'}`,
                      background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#c7d2fe' : '#94a3b8',
                      fontWeight: active ? 700 : 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span aria-hidden>📁</span>
                    {p.name}
                    <span
                      style={{
                        fontSize: 12,
                        background: 'rgba(255,255,255,0.08)',
                        padding: '1px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {p.snapshots.length}
                    </span>
                  </button>
                );
              })}
            </div>

            <SnapshotStrip
              snapshots={snapshots}
              selectedId={selectedId}
              onSelect={selectSnapshot}
              onOpenVisualization={(id) => navigate(`/visualization/${id}`)}
            />

            {detailLoading && (
              <div className={styles.loadingBlock}>
                <div className={styles.spinner} />
                <p>선택한 빌드의 분석 요약을 계산하는 중…</p>
              </div>
            )}

            {overview && selectedId != null && (
              <div className={styles.sections}>
                <QualitySummaryRow
                  qualityScore={overview.qualityScore}
                  qualityHint={overview.qualityHint}
                  astSummary={overview.astSummary}
                />
                <QualityMetricCards items={overview.metricCards} />
                <MetricsRadarSection axes={overview.radarAxes} />
                <DiagramPreviewSection
                  snapshotId={selectedId}
                  onDetailedView={() => navigate(`/visualization/${selectedId}`)}
                />
                <RefactoringSection items={overview.refactorings} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
