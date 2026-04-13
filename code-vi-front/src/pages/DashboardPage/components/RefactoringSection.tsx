import type { RefactoringSeverity, RefactoringSuggestion } from '../../../interface/dashboardOverview.interface';
import shared from '../dashboardShared.module.css';
import styles from './RefactoringSection.module.css';

type Props = {
  items: RefactoringSuggestion[];
};

function severityLabel(s: RefactoringSeverity): string {
  switch (s) {
    case 'risk':
      return '위험';
    case 'improve':
      return '개선 필요';
    default:
      return '양호';
  }
}

function renderEffectHighlighted(text: string, highlights: string[]) {
  if (!highlights.length) return text;
  const escaped = highlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        highlights.includes(part) ? (
          <strong key={i} className={styles.effectKw}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function RefactoringSection({ items }: Props) {
  return (
    <section className={shared.card}>
      <h2 className={shared.sectionTitle}>
        <span className={shared.sectionIcon} aria-hidden>
          ✨
        </span>
        리팩토링 인사이트
      </h2>
      <p className={shared.muted} style={{ marginBottom: '1rem' }}>
        CK 메트릭 기반 자동 분석 제안입니다. 적용 전 코드 리뷰와 테스트를 권장합니다.
      </p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li
            key={item.id}
            className={`${styles.insightCard} ${styles[`sev_${item.severity}`]}`}
          >
            <div className={styles.cardTop}>
              <span className={styles.targetBadge}>분석 대상</span>
              <span className={styles.targetName}>{item.targetLabel}</span>
              <span className={`${styles.statusPill} ${styles[`status_${item.severity}`]}`}>
                {severityLabel(item.severity)}
              </span>
            </div>

            <section className={styles.block}>
              <div className={styles.blockHead}>문제 요약</div>
              <p className={styles.oneLiner}>{item.problemSummary}</p>
              <div className={styles.metricChips} aria-label="핵심 메트릭">
                {(() => {
                  const m = item.problemCode.match(/LCOM\s+(\d+),\s*CBO\s+(\d+),\s*WMC\s+(\d+)/);
                  if (!m) return null;
                  return (
                    <>
                      <span className={styles.chip} title="Lack of Cohesion in Methods">LCOM {m[1]}</span>
                      <span className={styles.chip} title="Coupling Between Objects">CBO {m[2]}</span>
                      <span className={styles.chip} title="Weighted Methods per Class">WMC {m[3]}</span>
                    </>
                  );
                })()}
              </div>
            </section>

            <section className={styles.block}>
              <div className={styles.blockHead}>Before / After 비교</div>
              <div className={styles.codePair}>
              <div className={styles.codeCol}>
                <div className={styles.codeHead}>BEFORE</div>
                <pre className={`${styles.code} ${styles.codeBefore}`}>{item.problemCode}</pre>
              </div>
              <div className={styles.codeCol}>
                <div className={`${styles.codeHead} ${styles.codeHeadAfter}`}>AFTER</div>
                <pre className={`${styles.code} ${styles.codeAfter}`}>{item.improvedCode}</pre>
              </div>
              </div>
            </section>

            <section className={styles.effect}>
              <div className={styles.blockHead}>개선 효과</div>
              <p className={styles.effectText}>
                {renderEffectHighlighted(item.effectSummary, item.effectHighlights)}
              </p>
            </section>

            <details className={styles.detail}>
              <summary className={styles.detailSummary}>추가 설명 보기</summary>
              <p className={styles.detailText}>{item.detailExplanation}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
