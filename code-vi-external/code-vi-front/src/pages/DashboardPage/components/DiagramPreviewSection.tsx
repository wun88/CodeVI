import { useState } from 'react';
import shared from '../dashboardShared.module.css';
import styles from './DiagramPreviewSection.module.css';

const TABS = [
  { id: 'cohesion', label: '응집도 다이어그램' },
  { id: 'fan', label: 'Fan-in / Fan-out' },
  { id: 'coupling', label: '결합 네트워크' },
  { id: 'hierarchy', label: '구조 계층' },
] as const;

type Props = {
  snapshotId: number;
  onDetailedView: () => void;
};

export default function DiagramPreviewSection({ snapshotId, onDetailedView }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('cohesion');

  return (
    <section className={shared.card}>
      <div className={styles.head}>
        <h2 className={shared.sectionTitle} style={{ margin: 0 }}>
          <span className={shared.sectionIcon} aria-hidden>
            🔺
          </span>
          다이어그램 프리뷰
        </h2>
        <button type="button" className={shared.btnPrimary} onClick={onDetailedView}>
          정밀 보기
        </button>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="다이어그램 종류">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.preview} role="tabpanel">
        <div className={styles.previewInner}>
          <div className={styles.canvas} aria-label="다이어그램 미리보기">
            <div className={styles.miniHeader}>
              <span className={styles.miniTitle}>Preview</span>
              <span className={styles.miniMeta}>Snapshot #{snapshotId}</span>
            </div>

            <div className={styles.miniGraph}>
              <div className={`${styles.cluster} ${styles.clusterA}`}>
                <div className={styles.clusterTitle}>Group 1</div>
                <div className={styles.nodes}>
                  <span className={styles.node}>Controller</span>
                  <span className={styles.node}>Service</span>
                  <span className={styles.node}>Repository</span>
                </div>
              </div>

              <div className={styles.edges} aria-hidden>
                <span className={styles.edgeDot} />
                <span className={styles.edgeDot} />
                <span className={styles.edgeDot} />
              </div>

              <div className={`${styles.cluster} ${styles.clusterB}`}>
                <div className={styles.clusterTitle}>Group 2</div>
                <div className={styles.nodes}>
                  <span className={styles.node}>Util</span>
                  <span className={styles.node}>Helper</span>
                </div>
              </div>
            </div>

            <div className={styles.miniFooter}>
              <span className={styles.tag}>{TABS.find((x) => x.id === tab)?.label}</span>
              <span className={styles.miniHint}>상세 시각화에서 노드·메트릭·관계를 탐색하세요</span>
            </div>
          </div>

          <aside className={styles.guide}>
            <strong>요약</strong>
            <ul className={styles.guideList}>
              <li>
                <span className={styles.gKey}>탐색</span>
                <span className={styles.gVal}>노드 선택 → 우측 패널에서 메트릭 확인</span>
              </li>
              <li>
                <span className={styles.gKey}>구조</span>
                <span className={styles.gVal}>디렉토리/파일/클래스/함수 단위로 확장</span>
              </li>
              <li>
                <span className={styles.gKey}>연결</span>
                <span className={styles.gVal}>메서드 호출 관계 기반 링크 표시</span>
              </li>
            </ul>
            <p className={shared.muted} style={{ margin: '0.75rem 0 0' }}>
              현재 프리뷰는 개요용이며, 실제 분석 그래프는 상세 페이지에서 확인합니다.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
