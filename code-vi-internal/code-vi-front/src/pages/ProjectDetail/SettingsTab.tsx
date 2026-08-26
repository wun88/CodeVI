import { useEffect, useState } from 'react';
import { requirementsService } from '../../services/requirementsService';
import type { BaselineSummaryItem } from '../../interface/requirement.interface';
import type { TeamProjectSummary } from '../../interface/teamProject.interface';
import styles from './SettingsTab.module.css';

interface SettingsTabProps {
  project: TeamProjectSummary;
  teamProjectId: number;
}

export default function SettingsTab({ project, teamProjectId }: SettingsTabProps) {
  const [baselines, setBaselines] = useState<BaselineSummaryItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    requirementsService
      .getBaselines(teamProjectId)
      .then((data) => {
        if (!cancelled) setBaselines(data);
      })
      .catch(() => {
        if (!cancelled) setError('베이스라인 목록을 불러오지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [teamProjectId]);

  return (
    <div className={styles.wrapper}>
      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>프로젝트 정보</h3>
        <dl className={styles.metaList}>
          <div className={styles.metaRow}>
            <dt>프로젝트명</dt>
            <dd>{project.teamName}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>참여 멤버</dt>
            <dd>{project.members.length > 0 ? project.members.join(', ') : '없음'}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>요구사항 개수</dt>
            <dd>{project.requirementsCount}개</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>마지막 수정일</dt>
            <dd>{new Date(project.updatedAt).toLocaleString('ko-KR')}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>외부 연동 상태</h3>
        <p className={styles.hintText}>
          아래 상태는 실제 연동 데이터를 그대로 보여줍니다(하드코딩 아님).
        </p>
        <ul className={styles.integrationList}>
          <li className={styles.integrationItem}>
            <span className={styles.integrationName}>GitHub</span>
            {project.githubRepoFullName ? (
              <span className={styles.badgeConnected}>
                연결됨 · {project.githubRepoFullName}
                {project.githubDefaultBranch ? ` (${project.githubDefaultBranch})` : ''}
              </span>
            ) : (
              <span className={styles.badgeDisconnected}>연결 안 됨</span>
            )}
          </li>
          <li className={styles.integrationItem}>
            <span className={styles.integrationName}>Jenkins</span>
            {project.jenkinsJobName ? (
              <span className={styles.badgeConnected}>연결됨 · {project.jenkinsJobName}</span>
            ) : (
              <span className={styles.badgeDisconnected}>연결 안 됨</span>
            )}
          </li>
          <li className={styles.integrationItem}>
            <span className={styles.integrationName}>SonarQube</span>
            {project.sonarProjectKey ? (
              <span className={styles.badgeConnected}>연결됨 · {project.sonarProjectKey}</span>
            ) : (
              <span className={styles.badgeDisconnected}>연결 안 됨</span>
            )}
          </li>
        </ul>
      </section>

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>베이스라인</h3>
        {error && <p className={styles.errorText}>{error}</p>}
        {!baselines ? (
          <p className={styles.hintText}>불러오는 중...</p>
        ) : baselines.length === 0 ? (
          <p className={styles.hintText}>
            아직 지정된 베이스라인이 없습니다. 요구사항을 승인(approved) 상태로 전환한 뒤
            베이스라인을 지정하면 여기에 표시됩니다.
          </p>
        ) : (
          <ul className={styles.baselineList}>
            {baselines.map((b) => (
              <li key={b.baseline} className={styles.baselineItem}>
                <span>{b.baseline}</span>
                <span className={styles.baselineCount}>{b.count}개 요구사항</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
