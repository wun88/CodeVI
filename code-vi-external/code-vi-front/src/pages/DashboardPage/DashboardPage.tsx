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
    snapshots,
    selectedId,
    selectSnapshot,
    overview,
    listLoading,
    detailLoading,
    error,
  } = useDashboardData();

  const teamName = useMemo(() => readStored('cv_teamName') ?? '분석 워크스페이스', []);
  const projectName = useMemo(() => {
    const job = readStored('cv_jobName');
    if (job) return job;
    const tid = overview?.teamProjectId ?? snapshots[0]?.teamProjectId;
    return tid != null ? `프로젝트 #${tid}` : '프로젝트';
  }, [overview?.teamProjectId, snapshots]);

  const analyzedAtLabel = overview
    ? new Date(overview.analyzedAt).toLocaleString('ko-KR')
    : '—';

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      <Header onLoginClick={() => navigate('/login')} onLogout={handleLogout} />
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

        {!listLoading && !error && snapshots.length === 0 && (
          <div className={styles.emptyCard}>
            <span className={styles.emptyIcon} aria-hidden>
              📭
            </span>
            <p className={styles.emptyTitle}>등록된 스냅샷이 없습니다.</p>
            <p className={styles.emptyHint}>Jenkins 파이프라인을 실행하면 스냅샷이 생성됩니다.</p>
          </div>
        )}

        {!listLoading && snapshots.length > 0 && (
          <>
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
