import { useNavigate } from 'react-router-dom';
import { useProjectCodeQuality } from '../../hooks/useProjectCodeQuality';
import MetricsRadarSection from '../DashboardPage/components/MetricsRadarSection';
import QualityMetricCards from '../DashboardPage/components/QualityMetricCards';
import QualitySummaryRow from '../DashboardPage/components/QualitySummaryRow';
import RefactoringSection from '../DashboardPage/components/RefactoringSection';
import SnapshotStrip from '../DashboardPage/components/SnapshotStrip';
import styles from './CodeQualityTab.module.css';

interface CodeQualityTabProps {
  teamProjectId: number;
}

/**
 * DashboardPage(/dashboard, 로그인 랜딩 — 전역 프로젝트 선택기)의 프로젝트 스코프 버전 —
 * 이 프로젝트의 스냅샷만 useProjectCodeQuality로 가져와 같은 컴포넌트들을 재사용한다
 * (jej_23 Phase 12 후속). /dashboard 자체는 그대로 두고 여기에 탭만 새로 추가했다.
 */
export default function CodeQualityTab({ teamProjectId }: CodeQualityTabProps) {
  const navigate = useNavigate();
  const {
    snapshots,
    selectedId,
    selectSnapshot,
    overview,
    listLoading,
    detailLoading,
    error,
    aiLoading,
    aiError,
    generateAiRefactoring,
  } = useProjectCodeQuality(teamProjectId);

  if (listLoading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingBlock}>
          <div className={styles.spinner} />
          <p>스냅샷 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorBanner}>{error}</div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon} aria-hidden>
            📭
          </span>
          <p className={styles.emptyTitle}>아직 코드 분석 스냅샷이 없습니다.</p>
          <p className={styles.emptyHint}>
            GitHub 저장소를 연결하고 Jenkins 빌드가 완료되면 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <SnapshotStrip
        snapshots={snapshots}
        selectedId={selectedId}
        onSelect={selectSnapshot}
        onOpenVisualization={(id) => navigate(`/visualization/${id}`)}
      />

      {detailLoading && (
        <div className={styles.loadingBlock}>
          <div className={styles.spinner} />
          <p>선택한 빌드의 분석 요약을 계산하는 중...</p>
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
          <RefactoringSection
            items={overview.refactorings}
            aiLoading={aiLoading}
            aiError={aiError}
            onGenerateAi={generateAiRefactoring}
          />
        </div>
      )}
    </div>
  );
}
