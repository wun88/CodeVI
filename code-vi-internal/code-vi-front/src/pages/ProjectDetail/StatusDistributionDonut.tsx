import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { MappingStatus, MappingSummaryItem } from '../../interface/requirement.interface';
import styles from './StatusDistributionDonut.module.css';

// 기존 ProjectDetail.module.css의 .scoreBadge-* 배지 색과 QualityDonut.tsx의 등급 색을 그대로
// 재사용한다 — 이 페이지 안에서 이미 검증되어 쓰이고 있는 팔레트라 새로 고르지 않는다.
const STATUS_COLOR: Record<MappingStatus, string> = {
  implemented: 'rgba(110, 231, 183, 0.85)',
  mostly: 'rgba(159, 231, 240, 0.85)',
  partial: 'rgba(251, 191, 36, 0.85)',
  unimplemented: 'rgba(235, 245, 251, 0.18)',
};

const STATUS_LABEL: Record<MappingStatus, string> = {
  implemented: '구현 완료',
  mostly: '대부분 구현',
  partial: '일부 구현',
  unimplemented: '미구현',
};

interface StatusDistributionDonutProps {
  requirements: MappingSummaryItem[];
}

interface DonutDatum {
  status: MappingStatus;
  label: string;
  value: number;
}

/**
 * 요구사항 구현 상태 분포 도넛차트 (jej_23 Phase 12). Phase 7(코드 매핑)이 아직 한 번도 실행되지
 * 않은 프로젝트는 전부 미구현으로만 나와 의미가 없으므로, 상위 컴포넌트에서 mapping.mapped > 0일
 * 때만 렌더링한다(§2 완료 조건 — "Phase 7 이전에는 이 위젯들이 보이지 않음").
 */
export default function StatusDistributionDonut({ requirements }: StatusDistributionDonutProps) {
  const counts: Record<MappingStatus, number> = {
    implemented: 0,
    mostly: 0,
    partial: 0,
    unimplemented: 0,
  };
  requirements.forEach((r) => {
    counts[r.status] += 1;
  });

  const data: DonutDatum[] = (Object.keys(counts) as MappingStatus[])
    .map((status) => ({ status, label: STATUS_LABEL[status], value: counts[status] }))
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>상태 분포</h3>
      <div className={styles.body}>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                strokeWidth={2}
                stroke="#0a0e14"
              >
                {data.map((d) => (
                  <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as DonutDatum;
                  return (
                    <div className={styles.tooltip}>
                      <div className={styles.tooltipLabel}>{d.label}</div>
                      <div className={styles.tooltipValue}>{d.value}개</div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className={styles.legend}>
          {data.map((d) => (
            <li key={d.status} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: STATUS_COLOR[d.status] }} />
              <span className={styles.legendLabel}>{d.label}</span>
              <span className={styles.legendValue}>{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
