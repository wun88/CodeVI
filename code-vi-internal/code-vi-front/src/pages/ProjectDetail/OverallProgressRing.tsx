import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import styles from './OverallProgressRing.module.css';

const TRACK = 'rgba(235, 245, 251, 0.12)';

// DashboardPage/components/QualityDonut.tsx와 같은 톤(muted, no rainbow)을 재사용한다.
function grade(score: number): { label: 'A' | 'B' | 'C' | 'D'; desc: string; color: string } {
  if (score >= 85) return { label: 'A', desc: '우수 · 대부분 구현 완료', color: 'rgba(110, 231, 183, 0.92)' };
  if (score >= 70) return { label: 'B', desc: '양호 · 일부 보강 필요', color: 'rgba(159, 231, 240, 0.92)' };
  if (score >= 55) return { label: 'C', desc: '유지 · 검증 필요 구간 존재', color: 'rgba(251, 191, 36, 0.92)' };
  return { label: 'D', desc: '주의 · 구현 점검 필요', color: 'rgba(248, 113, 113, 0.92)' };
}

interface OverallProgressRingProps {
  score: number;
  sourceLabel: string;
}

/**
 * 전체 추정 진척률 원형 게이지 (jej_23 Phase 12 후속) — DashboardPage의 QualityDonut.tsx와 동일한
 * recharts 도넛 레시피를 재사용한다(새 팔레트를 고르지 않고 이미 검증된 톤을 그대로 씀).
 * "상태 분포" 도넛(카테고리별 개수)과 달리 이건 단일 요약 숫자 하나만 보여준다.
 */
export default function OverallProgressRing({ score, sourceLabel }: OverallProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const g = grade(clamped);
  const data = [
    { name: 'score', value: clamped },
    { name: 'rest', value: 100 - clamped },
  ];

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>전체 추정 진척률</h3>
      <div className={styles.body}>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="88%"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                <Cell fill={g.color} />
                <Cell fill={TRACK} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.centerLabel}>
            <span className={styles.scoreNum}>{clamped}%</span>
          </div>
        </div>
        <div className={styles.meta}>
          <span className={styles.gradeBadge} style={{ color: g.color }}>
            {g.label}
          </span>
          <p className={styles.desc}>{g.desc}</p>
          <p className={styles.source}>{sourceLabel}</p>
        </div>
      </div>
    </section>
  );
}
