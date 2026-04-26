import styles from './DashboardHeader.module.css';

type Props = {
  teamName: string;
  projectName: string;
  analyzedAtLabel: string;
  onLogout: () => void;
};

export default function DashboardHeader({
  teamName,
  projectName,
  analyzedAtLabel,
  onLogout,
}: Props) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroBg} aria-hidden />
      <div className={styles.heroInner}>
        <div className={styles.left}>
          <span className={styles.mark} aria-hidden>
            ⬡
          </span>
          <div className={styles.titles}>
            <div className={styles.kicker}>Analysis Overview</div>
            <h1 className={styles.product}>코드 품질 분석 대시보드</h1>
            <p className={styles.subtitle}>
              선택한 빌드 스냅샷을 기준으로 품질 점수·핵심 지표·메트릭 시각화·다이어그램·리팩토링 인사이트를 요약합니다.
            </p>
            <div className={styles.meta}>
              <span className={styles.badge}>{teamName}</span>
              <span className={styles.sep}>·</span>
              <span className={styles.project}>{projectName}</span>
            </div>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.analysisCard}>
            <div className={styles.analysisTop}>
              <span className={styles.analysisLabel}>최근 분석 기준</span>
              <span className={styles.analysisChip}>Snapshot 기준</span>
            </div>
            <time className={styles.analysisTime}>{analyzedAtLabel}</time>
            <div className={styles.analysisHint}>아래 카드에서 스냅샷을 바꾸면 전체 overview가 갱신됩니다.</div>
          </div>
          <button type="button" className={styles.logout} onClick={onLogout}>
            로그아웃2
          </button>
        </div>
      </div>
    </header>
  );
}
