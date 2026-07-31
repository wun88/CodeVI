import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import { teamProjectService } from '../../services/teamProjectService';
import { requirementsService } from '../../services/requirementsService';
import type { TeamProjectSummary } from '../../interface/teamProject.interface';
import type { Requirement, RequirementsSummary } from '../../interface/requirement.interface';
import styles from './ProjectDetail.module.css';

const PRIORITY_LABEL: Record<string, string> = {
  critical: '치명',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const FINDING_TYPE_LABEL: Record<string, string> = {
  duplicate: '중복',
  conflict: '충돌',
  omission: '누락',
};

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { teamProjectId } = useParams<{ teamProjectId: string }>();
  const projectId = Number(teamProjectId);

  const [project, setProject] = useState<TeamProjectSummary | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [summary, setSummary] = useState<RequirementsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const loadAll = () => {
    return Promise.all([
      teamProjectService.getProjectDetail(projectId),
      requirementsService.listByTeamProject(projectId),
      requirementsService.getSummary(projectId),
    ]);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    loadAll()
      .then(([projectData, requirementsData, summaryData]) => {
        if (cancelled) return;
        setProject(projectData);
        setRequirements(requirementsData);
        setSummary(summaryData);
      })
      .catch(() => {
        if (!cancelled) setError('프로젝트를 불러오지 못했습니다. 접근 권한이 없거나 존재하지 않는 프로젝트입니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleRecomputeAnalysis = async () => {
    setAnalysisError('');
    setAnalyzing(true);
    try {
      await requirementsService.recomputeAnalysis(projectId);
      const summaryData = await requirementsService.getSummary(projectId);
      setSummary(summaryData);
    } catch {
      setAnalysisError('AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header variant="internal" />
      <main className={styles.content}>
        <button className={styles.backBtn} onClick={() => navigate('/projects')} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          내 프로젝트로
        </button>

        {loading && <p className={styles.statusText}>불러오는 중...</p>}
        {!loading && error && <p className={styles.statusText}>{error}</p>}

        {!loading && !error && project && summary && (
          <>
            <h1 className={styles.title}>{project.teamName}</h1>
            <span className={`${styles.badge} ${styles[`badge-${project.statusVariant}`]}`}>
              <span className={styles.badgeDot} />
              {project.statusLabel}
            </span>

            {!project.codeAnalysis && (
              <div className={styles.connectCard}>
                <p className={styles.connectDesc}>
                  아직 연결된 코드가 없습니다. GitHub 저장소를 연결하면 이후 요구사항과 코드가 자동으로
                  매핑됩니다.
                </p>
                <button
                  type="button"
                  className={styles.connectBtn}
                  onClick={() => navigate(`/code-insight/github?teamProjectId=${projectId}`)}
                >
                  코드 연결
                </button>
              </div>
            )}

            {project.codeAnalysis && (
              <div className={styles.noticeCard}>
                코드가 연결되어 있습니다. Jenkins 빌드가 완료되면 요구사항-코드 매핑 결과가 표시됩니다
                (몇 분 정도 걸릴 수 있어요).
              </div>
            )}

            <div className={styles.kpiRow}>
              <div className={styles.kpiCard}>
                <p className={styles.kpiValue}>{summary.total}개</p>
                <p className={styles.kpiLabel}>전체 요구사항</p>
                <p className={styles.kpiSub}>
                  기능 {summary.functionalCount} · 비기능 {summary.nonFunctionalCount}
                </p>
              </div>
              <div className={styles.kpiCard}>
                <p className={styles.kpiValue}>
                  {summary.priorityDistribution.critical + summary.priorityDistribution.high}개
                </p>
                <p className={styles.kpiLabel}>치명/높음 우선순위</p>
                <p className={styles.kpiSub}>
                  보통 {summary.priorityDistribution.medium} · 낮음 {summary.priorityDistribution.low}
                </p>
              </div>
              <div className={styles.kpiCard}>
                <p className={styles.kpiValue}>{summary.analysis.totalFindings}건</p>
                <p className={styles.kpiLabel}>AI 분석 findings</p>
                <p className={styles.kpiSub}>
                  중복 {summary.analysis.duplicateCount} · 충돌 {summary.analysis.conflictCount} · 누락{' '}
                  {summary.analysis.missingCount}
                </p>
              </div>
              {/* 마감일(dueDate) 입력 경로가 아직 없어 항상 0건으로 나오는 위젯은 숨긴다
                  (입력 UI가 추가되면 이 카드와 아래 "마감 임박/지연" 섹션을 함께 복원). */}
            </div>

            <div className={styles.dashboardGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeaderRow}>
                  <h2 className={styles.sectionTitle}>AI 분석</h2>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={handleRecomputeAnalysis}
                    disabled={analyzing || requirements.length === 0}
                  >
                    {analyzing ? '분석 중...' : 'AI 분석 실행'}
                  </button>
                </div>
                {analysisError && <p className={styles.statusText}>{analysisError}</p>}
                {summary.analysis.recentFindings.length === 0 ? (
                  <p className={styles.statusText}>
                    아직 분석 결과가 없습니다. "AI 분석 실행"을 눌러 중복/충돌/누락 후보를 확인하세요.
                  </p>
                ) : (
                  <ul className={styles.findingList}>
                    {summary.analysis.recentFindings.map((finding) => (
                      <li key={finding.id} className={styles.findingItem}>
                        <span className={styles.findingType}>
                          {FINDING_TYPE_LABEL[finding.type] ?? finding.type}
                        </span>
                        <p className={styles.findingDesc}>{finding.description}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className={styles.cardHeaderRow}>
              <h2 className={styles.sectionTitle}>요구사항 ({requirements.length})</h2>
              <button
                type="button"
                className={styles.smallBtn}
                onClick={() => navigate(`/code-insight/new/${projectId}/requirements`)}
              >
                요구사항 추가
              </button>
            </div>
            {requirements.length === 0 ? (
              <p className={styles.statusText}>등록된 요구사항이 없습니다.</p>
            ) : (
              <ul className={styles.reqList}>
                {requirements.map((req) => (
                  <li key={req.id} className={styles.reqItem}>
                    <div className={styles.reqHeader}>
                      <span className={styles.reqTitle}>{req.title}</span>
                      <span className={styles.reqPriority}>
                        {PRIORITY_LABEL[req.priority] ?? req.priority}
                      </span>
                    </div>
                    {req.description && <p className={styles.reqDesc}>{req.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
