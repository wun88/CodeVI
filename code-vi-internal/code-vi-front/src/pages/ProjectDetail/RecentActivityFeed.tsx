import type { RecentActivityItem } from '../../interface/requirement.interface';
import styles from './RecentActivityFeed.module.css';

interface RecentActivityFeedProps {
  items: RecentActivityItem[];
}

/** 최근 활동 피드 — RequirementVersion 생성 시점 재사용, 별도 activity 테이블 없음 (jej_23 Phase 12) */
export default function RecentActivityFeed({ items }: RecentActivityFeedProps) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>최근 활동</h3>
      {items.length === 0 ? (
        <p className={styles.hintText}>아직 활동 이력이 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item, index) => (
            <li key={`${item.requirementId}-${item.createdAt}-${index}`} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.itemTitle}>{item.requirementTitle}</span>
                <span className={styles.itemVersion}>v{item.version}</span>
              </div>
              <p className={styles.itemMeta}>
                {new Date(item.createdAt).toLocaleString('ko-KR')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
