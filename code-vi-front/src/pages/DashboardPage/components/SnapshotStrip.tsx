import type { AstSnapshotSummary } from '../../../interface/ast.interface';
import shared from '../dashboardShared.module.css';
import styles from './SnapshotStrip.module.css';

type Props = {
  snapshots: AstSnapshotSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onOpenVisualization: (id: number) => void;
};

export default function SnapshotStrip({
  snapshots,
  selectedId,
  onSelect,
  onOpenVisualization,
}: Props) {
  const selected = snapshots.find((s) => s.id === selectedId) ?? null;

  return (
    <section
      className={`${shared.card} ${styles.snapshotRoot}`}
      data-has-selection={selected ? 'true' : 'false'}
    >
      {selected && (
        <div className={styles.liveBar} role="status" aria-live="polite">
          <span className={styles.liveLabel}>현재 기준 스냅샷</span>
          <span className={styles.liveValue}>
            #{selected.id}
            {selected.buildNumber != null ? ` · Build ${selected.buildNumber}` : ''}
            <span className={styles.liveTime}>
              {new Date(selected.createdAt).toLocaleString('ko-KR')}
            </span>
          </span>
        </div>
      )}

      <div className={styles.head}>
        <div>
          <h2 className={shared.sectionTitle} style={{ marginBottom: '0.35rem' }}>
            <span className={shared.sectionIcon} aria-hidden>
              🏗️
            </span>
            빌드 스냅샷
          </h2>
          <p className={shared.muted} style={{ margin: 0 }}>
            선택한 스냅샷이 아래 분석 결과의 <strong className={styles.strong}>기준 빌드</strong>가 됩니다.
          </p>
        </div>
        <div className={styles.current}>
          <span className={styles.currentLabel}>선택됨</span>
          <span className={styles.currentValue}>
            {selected ? `Snapshot #${selected.id}` : '—'}
            {selected?.buildNumber != null ? ` · Build ${selected.buildNumber}` : ''}
          </span>
        </div>
      </div>
      <div className={styles.strip}>
        {snapshots.map((snap) => {
          const active = snap.id === selectedId;
          return (
            <div
              key={snap.id}
              className={`${styles.snapCard} ${active ? styles.snapCardActive : ''}`}
            >
              <button
                type="button"
                className={styles.snapMain}
                onClick={() => onSelect(snap.id)}
              >
                <div className={styles.topRow}>
                  <span className={styles.snapId}>Snapshot #{snap.id}</span>
                  {active && <span className={styles.selectedPill}>기준</span>}
                </div>

                <div className={styles.midRow}>
                  <span className={styles.build}>
                    {snap.buildNumber != null ? `Build ${snap.buildNumber}` : 'Build —'}
                  </span>
                  <span className={styles.dot} aria-hidden>
                    ·
                  </span>
                  <span className={styles.date}>{new Date(snap.createdAt).toLocaleString('ko-KR')}</span>
                </div>
              </button>

              <div className={styles.bottomRow}>
                <span className={styles.hint}>overview 반영</span>
                <button
                  type="button"
                  className={`${shared.btnSecondary} ${styles.snapSecondary}`}
                  onClick={() => onOpenVisualization(snap.id)}
                >
                  상세 시각화
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
