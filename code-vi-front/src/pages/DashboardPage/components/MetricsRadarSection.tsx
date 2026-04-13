import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { RadarAxisData } from '../../../interface/dashboardOverview.interface';
import shared from '../dashboardShared.module.css';
import styles from './MetricsRadarSection.module.css';

type Props = {
  axes: RadarAxisData[];
};

type RadarDatum = {
  subject: string;
  value: number;
  fullMark: number;
  hint: string;
};

type AngleTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: string };
  textAnchor?: string;
};

function buildAngleTick(hintFor: (subject: string) => string) {
  return function AngleTick({ x = 0, y = 0, payload, textAnchor }: AngleTickProps) {
    const label = payload?.value;
    if (!label) return <g />;
    const hint = hintFor(label);
    const tip = hint ? `${label} — ${hint}` : label;
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{tip}</title>
        <text
          textAnchor={(textAnchor ?? 'middle') as 'start' | 'middle' | 'end'}
          fill="rgba(34,34,34,0.52)"
          fontSize={10}
          fontWeight={800}
          dy={3}
        >
          {label}
        </text>
      </g>
    );
  };
}

export default function MetricsRadarSection({ axes }: Props) {
  const data: RadarDatum[] = axes.map((a) => ({
    subject: a.subject,
    value: a.value,
    fullMark: a.fullMark,
    hint: a.hint,
  }));

  const hintFor = (subject: string) => data.find((d) => d.subject === subject)?.hint ?? '';
  const AngleTick = buildAngleTick(hintFor);

  return (
    <section className={shared.card}>
      <div className={styles.head}>
        <h2 className={shared.sectionTitle} style={{ margin: 0 }}>
          <span className={shared.sectionIcon} aria-hidden>
            🕸️
          </span>
          확장 메트릭 레이더
        </h2>
        <div className={styles.pill}>0–100 스케일 · 높을수록 유리</div>
      </div>

      <div className={styles.body}>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart cx="50%" cy="52%" outerRadius="74%" data={data}>
              <PolarGrid stroke="rgba(116, 146, 183, 0.35)" />
              <PolarAngleAxis dataKey="subject" tick={AngleTick} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as RadarDatum;
                  return (
                    <div className={styles.tooltip}>
                      <div className={styles.tooltipTitle}>{d.subject}</div>
                      <div className={styles.tooltipScore}>{Math.round(d.value)}점</div>
                      <p className={styles.tooltipHint}>{d.hint}</p>
                    </div>
                  );
                }}
              />
              <Radar
                name="지표"
                dataKey="value"
                stroke="#5f7fa3"
                fill="#7492b7"
                fillOpacity={0.26}
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#7492b7', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{
                  r: 8,
                  strokeWidth: 2,
                  stroke: '#fff',
                  fill: '#4a6a8a',
                  style: { filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' },
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
          <p className={styles.chartHint}>
            마우스를 올리면 설명·점수를 확인할 수 있습니다.
          </p>
        </div>

        <aside className={styles.side} aria-label="축별 요약 점수">
          <div className={styles.legendTitle}>축별 요약</div>
          <ul className={styles.axisList}>
            {axes.map((a) => (
              <li key={a.subject} className={styles.axisRow} title={a.hint}>
                <span className={styles.axisKey}>{a.subject}</span>
                <span className={styles.axisVal}>{Math.round(a.value)}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
