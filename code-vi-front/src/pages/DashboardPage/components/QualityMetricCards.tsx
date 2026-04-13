import type { QualityMetricCardData } from '../../../interface/dashboardOverview.interface';
import shared from '../dashboardShared.module.css';
import styles from './QualityMetricCards.module.css';

function statusLabel(status: QualityMetricCardData['status']): string {
  switch (status) {
    case 'excellent':
      return '우수';
    case 'good':
      return '양호';
    case 'maintain':
      return '주의';
    default:
      return '위험';
  }
}

function MetricCard({ item }: { item: QualityMetricCardData }) {
  const pct = Math.round((item.score / item.maxScore) * 100);
  return (
    <article className={`${styles.metricCard} ${styles[`st_${item.status}`]}`}>
      <div className={styles.metricTop}>
        <div className={styles.titleCol}>
          <span className={styles.metricTitle} title={item.title}>
            {item.title}
          </span>
          <span className={styles.desc} aria-label={item.description}>
            {item.description}
          </span>
        </div>
        <span className={styles.badge}>{statusLabel(item.status)}</span>
      </div>

      <div className={styles.scoreRow}>
        <div className={styles.scoreStack}>
          <span className={styles.score}>{item.score}</span>
          <span className={styles.max}>/ {item.maxScore}</span>
        </div>
        <div className={styles.pct}>{pct}%</div>
      </div>

      <div className={styles.barTrack} aria-hidden>
        <div className={styles.barFill} style={{ width: `${pct}%` }} />
      </div>
    </article>
  );
}

type Props = {
  items: QualityMetricCardData[];
};

export default function QualityMetricCards({ items }: Props) {
  return (
    <section className={shared.card}>
      <h2 className={shared.sectionTitle}>
        <span className={shared.sectionIcon} aria-hidden>
          📊
        </span>
        품질 지표 분석
      </h2>
      <div className={styles.grid}>
        {items.map((item) => (
          <MetricCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
