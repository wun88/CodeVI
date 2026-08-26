import { useEffect, useState } from 'react';
import { requirementsService } from '../../services/requirementsService';
import type { BuildDetail, BuildHistoryItem } from '../../interface/requirement.interface';
import styles from './BuildHistoryTab.module.css';

function statusClass(status: string): string {
  const upper = status.toUpperCase();
  if (upper === 'SUCCESS') return styles.statusSuccess;
  if (upper === 'FAILURE' || upper === 'FAILED') return styles.statusFailure;
  return styles.statusNeutral;
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  if (delta === 0) return '±0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

interface BuildHistoryTabProps {
  teamProjectId: number;
}

export default function BuildHistoryTab({ teamProjectId }: BuildHistoryTabProps) {
  const [builds, setBuilds] = useState<BuildHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 사용자가 명시적으로 행을 클릭하기 전까지는 최신 빌드(builds[0])를 기본 선택으로 사용한다 —
  // fetch 콜백에서 별도 useState를 갱신하면 두 useEffect가 연쇄적으로 setState를 호출하게 되어
  // (react-hooks/set-state-in-effect) 렌더 중 계산으로 대체한다.
  const [selectedBuildNumberOverride, setSelectedBuildNumberOverride] = useState<number | null>(
    null,
  );
  const [detail, setDetail] = useState<BuildDetail | null>(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // fetch-on-mount 패턴(DocumentsTab.tsx/ProjectDetail.tsx와 동일) — react-hooks/set-state-in-effect가
    // 과도하게 반응하는 것으로 보여 다음 줄만 억제한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    requirementsService
      .getBuildHistory(teamProjectId)
      .then((data) => {
        if (cancelled) return;
        setBuilds(data);
      })
      .catch(() => {
        if (!cancelled) setError('빌드 이력을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamProjectId]);

  const selectedBuildNumber = selectedBuildNumberOverride ?? builds?.[0]?.buildNumber ?? null;

  useEffect(() => {
    if (selectedBuildNumber == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailError('');
    requirementsService
      .getBuildDetail(teamProjectId, selectedBuildNumber)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetailError('빌드 상세를 불러오지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [teamProjectId, selectedBuildNumber]);

  if (loading) return <p className={styles.hintText}>불러오는 중...</p>;
  if (error) return <p className={styles.errorText}>{error}</p>;
  if (!builds || builds.length === 0) {
    return (
      <p className={styles.hintText}>
        아직 실제 Jenkins 빌드 이력이 없습니다. 코드를 연결하고 빌드가 실행되면 여기에 표시됩니다.
      </p>
    );
  }

  const successCount = builds.filter((b) => b.status.toUpperCase() === 'SUCCESS').length;
  const successRate = Math.round((successCount / builds.length) * 100);
  const scoredBuilds = builds.filter((b) => b.averageScore != null);
  const avgProgress =
    scoredBuilds.length > 0
      ? Math.round(
          scoredBuilds.reduce((sum, b) => sum + (b.averageScore ?? 0), 0) / scoredBuilds.length,
        )
      : null;
  const latestBuild = builds[0];

  return (
    <div className={styles.wrapper}>
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryValue}>#{latestBuild.buildNumber}</p>
          <p className={styles.summaryLabel}>최근 빌드</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryValue}>{successRate}%</p>
          <p className={styles.summaryLabel}>성공률</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryValue}>{avgProgress != null ? `${avgProgress}%` : '—'}</p>
          <p className={styles.summaryLabel}>평균 진척</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryValue}>{builds.length}</p>
          <p className={styles.summaryLabel}>누적 빌드</p>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>빌드</th>
                <th>상태</th>
                <th>진척률</th>
                <th>증감</th>
                <th>커밋</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((b) => (
                <tr
                  key={b.buildNumber}
                  className={`${styles.row} ${b.buildNumber === selectedBuildNumber ? styles.rowActive : ''}`}
                  onClick={() => setSelectedBuildNumberOverride(b.buildNumber)}
                >
                  <td>#{b.buildNumber}</td>
                  <td>
                    <span className={statusClass(b.status)}>{b.status}</span>
                  </td>
                  <td>{b.averageScore != null ? `${b.averageScore}%` : '—'}</td>
                  <td>{formatDelta(b.scoreDelta)}</td>
                  <td className={styles.commitCell}>{b.commitHash.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.detailPanel}>
          {detailError && <p className={styles.errorText}>{detailError}</p>}
          {detail && (
            <>
              <h3 className={styles.detailTitle}>빌드 #{detail.buildNumber} 상세</h3>
              <p className={styles.hintText}>
                {new Date(detail.createdAt).toLocaleString('ko-KR')} · {detail.commitHash}
              </p>
              {detail.buildUrl && (
                <a
                  className={styles.buildLink}
                  href={detail.buildUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Jenkins에서 보기 →
                </a>
              )}

              <p className={styles.sectionLabel}>
                변경된 요구사항 ({detail.changedRequirements.length})
              </p>
              {detail.changedRequirements.length === 0 ? (
                <p className={styles.hintText}>이 빌드에서 점수가 바뀐 요구사항이 없습니다.</p>
              ) : (
                <ul className={styles.changedList}>
                  {detail.changedRequirements.map((c) => (
                    <li key={c.requirementId} className={styles.changedItem}>
                      <span>{c.title}</span>
                      <span className={styles.changedScore}>
                        {c.previousScore ?? '—'} → {c.currentScore}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
