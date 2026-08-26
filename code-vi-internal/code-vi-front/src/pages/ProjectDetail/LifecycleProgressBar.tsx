import styles from './LifecycleProgressBar.module.css';

const STAGES = [
  { key: 'elicitation', label: '도출' },
  { key: 'analysis', label: '분석' },
  { key: 'specification', label: '명세화' },
  { key: 'validation', label: '검증' },
  { key: 'tracking', label: '추적' },
] as const;

interface LifecycleProgressBarProps {
  hasRequirements: boolean;
  hasDocuments: boolean;
  mappingTotal: number;
  mappingMapped: number;
  hasBuilds: boolean;
}

/**
 * 요구사항 엔지니어링 5단계(도출→분석→명세화→검증→추적) 진척률 (jej_23 Phase 12).
 * ReqFlow 원본(src/utils/dashboard.ts::computeLifecycleProgress)은 approved/baseline 비율 등을
 * 섞어 계산하지만, CodeVi는 이미 있는 Phase 7·9·10 산출물로 더 명확하게 대응시킬 수 있어
 * 그쪽을 그대로 쓴다(로드맵 §2 Phase 12에 확정된 기준) — 도출/분석은 요구사항 존재 여부,
 * 명세화는 문서 생성 여부(Phase 9), 검증은 코드 매핑 완료 비율(Phase 7), 추적은 빌드 연동 여부(Phase 10).
 */
export default function LifecycleProgressBar({
  hasRequirements,
  hasDocuments,
  mappingTotal,
  mappingMapped,
  hasBuilds,
}: LifecycleProgressBarProps) {
  const progressByStage: Record<(typeof STAGES)[number]['key'], number> = {
    elicitation: hasRequirements ? 100 : 0,
    analysis: hasRequirements ? 100 : 0,
    specification: hasDocuments ? 100 : 0,
    validation: mappingTotal > 0 ? Math.round((mappingMapped / mappingTotal) * 100) : 0,
    tracking: hasBuilds ? 100 : 0,
  };

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>요구사항 라이프사이클 진척</h3>
      <ul className={styles.list}>
        {STAGES.map((stage) => {
          const value = progressByStage[stage.key];
          return (
            <li key={stage.key} className={styles.row}>
              <span className={styles.label}>{stage.label}</span>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${value}%` }} />
              </div>
              <span className={styles.value}>{value}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
