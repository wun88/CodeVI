import type { AstSummaryBlock } from '../../../interface/dashboardOverview.interface';
import shared from '../dashboardShared.module.css';
import QualityDonut from './QualityDonut';
import styles from './QualitySummaryRow.module.css';

type Props = {
  qualityScore: number;
  qualityHint: string;
  astSummary: AstSummaryBlock;
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

export default function QualitySummaryRow({ qualityScore, qualityHint, astSummary }: Props) {
  return (
    <div className={styles.grid}>
      <section className={`${shared.card} ${styles.cardLift}`}>
        <div className={styles.cardHead}>
          <h2 className={shared.sectionTitle} style={{ margin: 0 }}>
          <span className={shared.sectionIcon} aria-hidden>
            ⏱
          </span>
          코드 품질 점수
          </h2>
          <div className={styles.badge}>overall</div>
        </div>
        <QualityDonut score={qualityScore} />
        <div className={styles.diagnosis}>
          <div className={styles.diagnosisTitle}>진단</div>
          <p className={styles.diagnosisText}>{qualityHint}</p>
        </div>
      </section>

      <section className={`${shared.card} ${styles.cardLift}`}>
        <div className={styles.cardHead}>
          <h2 className={shared.sectionTitle} style={{ margin: 0 }}>
          <span className={shared.sectionIcon} aria-hidden>
            📋
          </span>
          AST 요약 분석 결과
          </h2>
          <div className={styles.badge}>ast</div>
        </div>
        <div className={styles.statGrid}>
          <Stat label="분석 파일" value={`${astSummary.fileCount}`} sub="files" />
          <Stat label="함수 수" value={`${astSummary.functionCount}`} sub="functions" />
          <Stat
            label="AST 노드(추정)"
            value={astSummary.astNodeCount.toLocaleString('ko-KR')}
            sub="nodes"
          />
          <Stat label="평균 함수 길이" value={`${astSummary.avgFunctionLoc}`} sub="LOC" />
          <Stat label="분석 시간(추정)" value={`${astSummary.analysisSeconds}`} sub="sec" />
        </div>
        <p className={shared.muted} style={{ marginTop: '0.9rem' }}>
          스냅샷 AST를 기반으로 산출한 요약값입니다. 세부 구조 탐색은 상세 시각화에서 확인할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
