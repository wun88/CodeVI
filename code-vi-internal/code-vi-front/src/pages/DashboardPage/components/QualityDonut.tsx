import type { CSSProperties } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import styles from './QualityDonut.module.css';

type Props = {
  score: number;
};

const TRACK = '#e2e8f0';

function grade(score: number): { label: 'A' | 'B' | 'C' | 'D'; desc: string; color: string } {
  if (score >= 85) return { label: 'A', desc: '우수 · 안정적인 품질', color: '#10b981' };
  if (score >= 70) return { label: 'B', desc: '양호 · 일부 개선 여지', color: '#3b82f6' };
  if (score >= 55) return { label: 'C', desc: '유지 · 리스크 구간 존재', color: '#f59e0b' };
  return { label: 'D', desc: '위험 · 우선 개선 권장', color: '#ef4444' };
}

export default function QualityDonut({ score }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const g = grade(clamped);
  const data = [
    { name: 'score', value: clamped },
    { name: 'rest', value: 100 - clamped },
  ];

  return (
    <div className={styles.wrap} style={{ '--donut-accent': g.color } as CSSProperties}>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={200}>
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
          <div className={styles.gradeRow}>
            <span className={styles.grade} style={{ color: g.color }}>
              {g.label}
            </span>
            <span className={styles.scoreNum}>{clamped}</span>
            <span className={styles.scoreOut}>/100</span>
          </div>
          <div className={styles.gradeDesc}>{g.desc}</div>
        </div>
      </div>
      <div className={styles.scale} aria-hidden>
        <div className={styles.scaleBar} />
        <div className={styles.scaleStops}>
          <span className={`${styles.stop} ${clamped < 55 ? styles.stopActive : ''}`}>D</span>
          <span className={`${styles.stop} ${clamped >= 55 && clamped < 70 ? styles.stopActive : ''}`}>C</span>
          <span className={`${styles.stop} ${clamped >= 70 && clamped < 85 ? styles.stopActive : ''}`}>B</span>
          <span className={`${styles.stop} ${clamped >= 85 ? styles.stopActive : ''}`}>A</span>
        </div>
      </div>
    </div>
  );
}