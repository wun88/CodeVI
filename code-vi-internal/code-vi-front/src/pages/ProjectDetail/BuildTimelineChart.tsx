import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BuildHistoryItem } from '../../interface/requirement.interface';
import styles from './BuildTimelineChart.module.css';

interface BuildTimelineChartProps {
  builds: BuildHistoryItem[];
}

interface TimelineDatum {
  buildNumber: number;
  averageScore: number;
  createdAt: string;
}

/**
 * 빌드별 평균 구현 점수 추이(jej_23 Phase 12) — Phase 10의 build-history를 그대로 재사용한다
 * (score-timeline 원시 스냅샷을 다시 집계하지 않는다. build-history가 이미 빌드별 평균을 계산해
 * 두었기 때문). 단일 시리즈라 범례 없이 제목으로 식별한다(dataviz 스킬 — 단일 시리즈는 범례 불필요).
 */
export default function BuildTimelineChart({ builds }: BuildTimelineChartProps) {
  const data: TimelineDatum[] = builds
    .filter((b) => b.averageScore != null)
    .map((b) => ({
      buildNumber: b.buildNumber,
      averageScore: b.averageScore as number,
      createdAt: b.createdAt,
    }))
    .sort((a, b) => a.buildNumber - b.buildNumber);

  if (data.length === 0) return null;

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>빌드별 평균 진척률</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="buildNumber"
            tickFormatter={(v: number) => `#${v}`}
            tick={{ fontSize: 11, fill: 'rgba(235, 245, 251, 0.52)' }}
            axisLine={{ stroke: 'rgba(235, 245, 251, 0.14)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'rgba(235, 245, 251, 0.52)' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as TimelineDatum;
              return (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipTitle}>빌드 #{d.buildNumber}</div>
                  <div className={styles.tooltipValue}>{d.averageScore}%</div>
                  <div className={styles.tooltipDate}>
                    {new Date(d.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="averageScore"
            stroke="rgba(159, 231, 240, 0.85)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'rgba(159, 231, 240, 0.85)', strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: 'rgba(235, 245, 251, 0.72)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
