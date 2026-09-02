import type { RefactoringSeverity, RefactoringSuggestion } from '../../../interface/dashboardOverview.interface';
import DiffHunkReview from './DiffHunkReview';
import shared from '../dashboardShared.module.css';
import styles from './RefactoringSection.module.css';

type Props = {
  items: RefactoringSuggestion[];
  aiLoading?: boolean;
  aiError?: string;
  onGenerateAi?: () => void;
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

export default function RefactoringSection({ items, aiLoading, aiError, onGenerateAi }: Props) {
  const hasAiCandidates = items.some((item) => item.classId != null);

  return (
    <section className={shared.card}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={shared.sectionTitle}>
            <span className={shared.sectionIcon} aria-hidden>
              ✨
            </span>
            리팩토링 인사이트
          </h2>
          <p className={shared.muted}>
            CK 메트릭 기반 자동 분석 제안입니다. 적용 전 코드 리뷰와 테스트를 권장합니다.
          </p>
        </div>
        {onGenerateAi && (
          <button
            type="button"
            className={shared.btnPrimary}
            disabled={!hasAiCandidates || aiLoading}
            onClick={onGenerateAi}
          >
            {aiLoading ? 'AI 제안 생성 중...' : 'AI 상세 제안 생성'}
          </button>
        )}
      </div>
      {aiError && <p className={styles.aiError}>{aiError}</p>}
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
              {item.metrics && (
                <div className={styles.metricChips} aria-label="핵심 메트릭">
                  <span className={styles.chip} title="Lack of Cohesion in Methods">
                    LCOM {item.metrics.lcom}
                  </span>
                  <span className={styles.chip} title="Coupling Between Objects">
                    CBO {item.metrics.cbo}
                  </span>
                  <span className={styles.chip} title="Weighted Methods per Class">
                    WMC {item.metrics.wmc}
                  </span>
                </div>
              )}
            </section>

            <section className={styles.block}>
              <div className={styles.blockHead}>왜 이렇게 바뀌는지</div>
              <p className={styles.detailText}>{item.detailExplanation}</p>
            </section>

            <section className={styles.block}>
              <div className={styles.blockHead}>변경 사항 검토</div>
              <p className={styles.diffHint}>
                변경마다 적용 여부를 골라보세요. 기본은 전부 적용이고, 원하지 않는 부분만
                "원본 유지"로 끄면 최종 코드에서 빠집니다.
              </p>
              <DiffHunkReview
                key={`${item.id}:${item.improvedCode}`}
                before={item.problemCode}
                after={item.improvedCode}
              />
            </section>

            <section className={styles.effect}>
              <div className={styles.blockHead}>개선 효과</div>
              <p className={styles.effectText}>
                {renderEffectHighlighted(item.effectSummary, item.effectHighlights)}
              </p>
            </section>
          </li>
        ))}
      </ul>
    </section>
  );
}
