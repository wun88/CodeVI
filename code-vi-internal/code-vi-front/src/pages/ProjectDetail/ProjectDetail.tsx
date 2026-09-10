import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import { teamProjectService } from '../../services/teamProjectService';
import { requirementsService } from '../../services/requirementsService';
import { githubConnectService } from '../../services/githubConnectService';
import type { TeamProjectSummary } from '../../interface/teamProject.interface';
import type {
  BuildHistoryItem,
  GeneratedDocument,
  MappingStatus,
  MappingSummary,
  RecentActivityItem,
  Requirement,
  RequirementsSummary,
} from '../../interface/requirement.interface';
import RequirementDetailModal from './RequirementDetailModal';
import DocumentsTab from './DocumentsTab';
import BuildHistoryTab from './BuildHistoryTab';
import SettingsTab from './SettingsTab';
import CodeQualityTab from './CodeQualityTab';
import MappingGraphSection from './MappingGraphSection';
import LifecycleProgressBar from './LifecycleProgressBar';
import OverallProgressRing from './OverallProgressRing';
import StatusDistributionDonut from './StatusDistributionDonut';
import BuildTimelineChart from './BuildTimelineChart';
import RecentActivityFeed from './RecentActivityFeed';
import AnalysisFindingsPanel from './AnalysisFindingsPanel';
import FilterDropdown from './FilterDropdown';
import styles from './ProjectDetail.module.css';

type ProjectTab = 'overview' | 'documents' | 'buildHistory' | 'settings';

/** 워크스페이스 최상위 토글 — 요구사항 관리 ↔ 코드 품질 분석을 한 페이지(SPA)에서 전환 */
type WorkspaceView = 'requirements' | 'quality';

const PRIORITY_LABEL: Record<string, string> = {
  critical: '치명',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const MAPPING_STATUS_LABEL: Record<MappingStatus, string> = {
  implemented: '완료',
  mostly: '대부분',
  partial: '일부',
  unimplemented: '미구현',
};

type ScoreFilter = 'all' | 'high' | 'mid' | 'low';

function matchesScoreFilter(score: number, filter: ScoreFilter): boolean {
  if (filter === 'high') return score >= 70;
  if (filter === 'mid') return score >= 40 && score < 70;
  if (filter === 'low') return score < 40;
  return true;
}

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { teamProjectId } = useParams<{ teamProjectId: string }>();
  const projectId = Number(teamProjectId);

  const [project, setProject] = useState<TeamProjectSummary | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [summary, setSummary] = useState<RequirementsSummary | null>(null);
  const [mapping, setMapping] = useState<MappingSummary | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [builds, setBuilds] = useState<BuildHistoryItem[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [revalidating, setRevalidating] = useState(false);
  const [mappingError, setMappingError] = useState('');
  const [statusFilter, setStatusFilter] = useState<MappingStatus | 'all'>('all');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [view, setView] = useState<WorkspaceView>('requirements');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeNotice, setReanalyzeNotice] = useState('');
  const [reanalyzeError, setReanalyzeError] = useState('');

  const loadAll = () => {
    return Promise.all([
      teamProjectService.getProjectDetail(projectId),
      requirementsService.listByTeamProject(projectId),
      requirementsService.getSummary(projectId),
      requirementsService.getMappingSummary(projectId),
      // 대시보드 잔여 위젯(라이프사이클 진척/빌드 타임라인/최근 활동)이 개요 탭에 필요해
      // 초기 로드에 함께 포함한다 — 문서/빌드 이력 탭 자체의 전체 목록 조회와는 별개다 (jej_23 Phase 12).
      requirementsService.listDocuments(projectId),
      requirementsService.getBuildHistory(projectId),
      requirementsService.getRecentActivity(projectId),
    ]);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    loadAll()
      .then(
        ([
          projectData,
          requirementsData,
          summaryData,
          mappingData,
          documentsData,
          buildsData,
          activityData,
        ]) => {
          if (cancelled) return;
          setProject(projectData);
          setRequirements(requirementsData);
          setSummary(summaryData);
          setMapping(mappingData);
          setDocuments(documentsData);
          setBuilds(buildsData);
          setActivity(activityData);
          // 코드 분석이 있는 프로젝트는 코드 품질이 주가 되므로 그 뷰를 기본으로 연다 —
          // 요구사항 전용 프로젝트는 보여줄 코드 데이터가 없으니 요구사항 관리로 연다.
          setView(projectData.codeAnalysis ? 'quality' : 'requirements');
        },
      )
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

  const handleRevalidateMapping = async () => {
    setMappingError('');
    setRevalidating(true);
    try {
      await requirementsService.recomputeMapping(projectId);
      const mappingData = await requirementsService.getMappingSummary(projectId);
      setMapping(mappingData);
    } catch {
      setMappingError('재검증에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setRevalidating(false);
    }
  };

  const handleReanalyze = async () => {
    setReanalyzeNotice('');
    setReanalyzeError('');
    setReanalyzing(true);
    try {
      await githubConnectService.reanalyzeProject(projectId);
      setReanalyzeNotice(
        '분석을 다시 요청했습니다. 빌드가 끝나면 이 화면에 결과가 표시됩니다 (몇 분 소요).',
      );
    } catch {
      setReanalyzeError(
        '분석 재요청에 실패했습니다. 저장소에 접근 가능한 GitHub 계정으로 연결되어 있는지 확인해주세요.',
      );
    } finally {
      setReanalyzing(false);
    }
  };

  const handleRequirementUpdated = (updated: Requirement) => {
    setRequirements((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const mappingByRequirementId = new Map((mapping?.requirements ?? []).map((m) => [m.requirementId, m]));
  const selectedRequirement = requirements.find((r) => r.id === selectedRequirementId) ?? null;

  // 전체 추정 진척률 — 최근 빌드(Phase 10)의 평균 점수가 있으면 그걸 쓰고, 빌드 이력이 아직
  // 없으면 매핑 요약(Phase 7)에서 직접 평균을 낸다. builds는 최신순(DESC)이라 builds[0]이 최신.
  const latestBuild = builds[0];
  const mappingAverage =
    mapping && mapping.requirements.length > 0
      ? Math.round(
          mapping.requirements.reduce((sum, r) => sum + r.implementationScore, 0) /
            mapping.requirements.length,
        )
      : 0;
  const overallScore = latestBuild?.averageScore ?? mappingAverage;
  const overallScoreSource = latestBuild
    ? `최근 빌드 #${latestBuild.buildNumber} 기준`
    : '요구사항-코드 매핑 기준';

  const filteredRequirements = requirements.filter((req) => {
    const item = mappingByRequirementId.get(req.id);
    if (statusFilter !== 'all' && item?.status !== statusFilter) return false;
    return matchesScoreFilter(item?.implementationScore ?? 0, scoreFilter);
  });

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

        {!loading && !error && project && summary && mapping && (
          <>
            <h1 className={styles.title}>{project.teamName}</h1>
            <span className={`${styles.badge} ${styles[`badge-${project.statusVariant}`]}`}>
              <span className={styles.badgeDot} />
              {project.statusLabel}
            </span>

            {!project.codeAnalysis && !project.githubRepoFullName && (
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

            {/* 연결됐지만 첫 분석 결과가 아직 없는 상태 — 빌드 실패로 멈춰 있을 수 있으므로
                재분석(사용자 토큰으로 Jenkins credential/잡 갱신 후 재빌드) 진입점을 제공한다. */}
            {!project.codeAnalysis && project.githubRepoFullName && (
              <div className={styles.connectCard}>
                <p className={styles.connectDesc}>
                  {project.githubRepoFullName} 저장소가 연결되었습니다. 첫 분석이 완료되면 결과가
                  표시됩니다 — 몇 분 정도 걸릴 수 있어요. 오래 진행되지 않으면 분석을 다시
                  요청해보세요.
                </p>
                <button
                  type="button"
                  className={styles.connectBtn}
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                >
                  {reanalyzing ? '요청 중...' : '분석 다시 시도'}
                </button>
                {reanalyzeNotice && <p className={styles.connectDesc}>{reanalyzeNotice}</p>}
                {reanalyzeError && <p className={styles.error}>{reanalyzeError}</p>}
              </div>
            )}

            {project.codeAnalysis && (
              <div className={styles.noticeCard}>
                코드가 연결되어 있습니다. Jenkins 빌드가 완료되면 요구사항-코드 매핑 결과가 표시됩니다
                (몇 분 정도 걸릴 수 있어요).
              </div>
            )}

            {/* 최상위 토글 — 요구사항 관리 ↔ 코드 품질 분석. 코드 품질은 분석 데이터가
                생기기 전까지 비활성(요구사항 전용 프로젝트 안내는 title로 제공). */}
            <div className={styles.viewToggle} role="tablist">
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${view === 'requirements' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setView('requirements')}
              >
                요구사항 관리
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${view === 'quality' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setView('quality')}
                disabled={!project.codeAnalysis}
                title={
                  project.codeAnalysis
                    ? undefined
                    : '코드를 연결하고 첫 빌드가 완료되면 열립니다'
                }
              >
                코드 품질 분석
              </button>
            </div>

            {view === 'quality' && project.codeAnalysis && (
              <CodeQualityTab teamProjectId={projectId} />
            )}

            {view === 'requirements' && (
            <div className={styles.tabRow}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                개요
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'documents' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('documents')}
              >
                문서
              </button>
              {project.codeAnalysis && (
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'buildHistory' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('buildHistory')}
                >
                  빌드 이력
                </button>
              )}
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                설정
              </button>
            </div>
            )}

            {view === 'requirements' && activeTab === 'documents' && (
              <DocumentsTab teamProjectId={projectId} requirements={requirements} />
            )}

            {view === 'requirements' && activeTab === 'buildHistory' && project.codeAnalysis && (
              <BuildHistoryTab teamProjectId={projectId} />
            )}

            {view === 'requirements' && activeTab === 'settings' && (
              <SettingsTab project={project} teamProjectId={projectId} />
            )}

            {view === 'requirements' && activeTab === 'overview' && (
              <>
            <div className={styles.heroRow}>
              <OverallProgressRing score={overallScore} sourceLabel={overallScoreSource} />
              <LifecycleProgressBar
                hasRequirements={requirements.length > 0}
                hasDocuments={documents.length > 0}
                mappingTotal={mapping.total}
                mappingMapped={mapping.mapped}
                hasBuilds={builds.length > 0}
              />
            </div>

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
                  <h2 className={styles.sectionTitle}>요구사항-코드 매핑</h2>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={handleRevalidateMapping}
                    disabled={revalidating || requirements.length === 0}
                  >
                    {revalidating ? '재검증 중...' : '재검증'}
                  </button>
                </div>
                {mappingError && <p className={styles.statusText}>{mappingError}</p>}
                <p className={styles.mappingBannerText}>
                  <span className={styles.mappingBannerStrong}>{mapping.total}</span>개 중{' '}
                  <span className={styles.mappingBannerStrong}>{mapping.mapped}</span>개 매핑됨
                  {!project.codeAnalysis && ' — 코드를 연결하면 자동으로 계산됩니다.'}
                </p>
                <MappingGraphSection requirements={requirements} mapping={mapping} />
              </section>

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
                <AnalysisFindingsPanel
                  teamProjectId={projectId}
                  recentFindings={summary.analysis.recentFindings}
                  onNavigateToRequirement={setSelectedRequirementId}
                />
              </section>
            </div>

            {(mapping.mapped > 0 || builds.length > 0 || activity.length > 0) && (
              <div className={styles.widgetGrid}>
                {mapping.mapped > 0 && (
                  <StatusDistributionDonut requirements={mapping.requirements} />
                )}
                {builds.length > 0 && <BuildTimelineChart builds={builds} />}
                <RecentActivityFeed items={activity} />
                {mapping.mapped > 0 && (
                  <section className={styles.card}>
                    <h3 className={styles.sectionTitle}>구현 커버리지가 낮은 요구사항</h3>
                    <ul className={styles.findingList}>
                      {[...mapping.requirements]
                        .sort((a, b) => a.implementationScore - b.implementationScore)
                        .slice(0, 5)
                        .map((item) => (
                          <li key={item.requirementId} className={styles.findingItem}>
                            <span className={styles.findingType}>{item.implementationScore}%</span>
                            <p className={styles.findingDesc}>{item.title}</p>
                          </li>
                        ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

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

            {requirements.length > 0 && (
              <div className={styles.filterRow}>
                <FilterDropdown
                  ariaLabel="상태 필터"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: '상태: 전체' },
                    { value: 'implemented', label: '완료' },
                    { value: 'mostly', label: '대부분' },
                    { value: 'partial', label: '일부' },
                    { value: 'unimplemented', label: '미구현' },
                  ]}
                />
                <FilterDropdown
                  ariaLabel="점수 필터"
                  value={scoreFilter}
                  onChange={setScoreFilter}
                  options={[
                    { value: 'all', label: '점수: 전체' },
                    { value: 'high', label: '70% 이상' },
                    { value: 'mid', label: '40~69%' },
                    { value: 'low', label: '40% 미만' },
                  ]}
                />
              </div>
            )}

            {requirements.length === 0 ? (
              <p className={styles.statusText}>등록된 요구사항이 없습니다.</p>
            ) : filteredRequirements.length === 0 ? (
              <p className={styles.statusText}>필터에 맞는 요구사항이 없습니다.</p>
            ) : (
              <ul className={styles.reqList}>
                {filteredRequirements.map((req) => {
                  const mappingItem = mappingByRequirementId.get(req.id);
                  return (
                    <li
                      key={req.id}
                      className={`${styles.reqItem} ${styles.reqItemClickable}`}
                      onClick={() => setSelectedRequirementId(req.id)}
                    >
                      <div className={styles.reqHeader}>
                        <span className={styles.reqTitle}>{req.title}</span>
                        <div className={styles.reqBadgeGroup}>
                          {mappingItem && (
                            <span
                              className={`${styles.scoreBadge} ${styles[`scoreBadge-${mappingItem.status}`]}`}
                            >
                              {mappingItem.implementationScore}% · {MAPPING_STATUS_LABEL[mappingItem.status]}
                            </span>
                          )}
                          <span className={styles.reqPriority}>
                            {PRIORITY_LABEL[req.priority] ?? req.priority}
                          </span>
                        </div>
                      </div>
                      {req.description && <p className={styles.reqDesc}>{req.description}</p>}
                      {mappingItem && (mappingItem.matchCount > 0 || mappingItem.missingCount > 0) && (
                        <p className={styles.reqStats}>
                          유사도 {Math.round(mappingItem.similarityAvg * 100)}% · 매칭{' '}
                          {mappingItem.matchCount} · 누락 {mappingItem.missingCount}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
              </>
            )}
          </>
        )}
      </main>

      {selectedRequirement && (
        <RequirementDetailModal
          requirement={selectedRequirement}
          allRequirements={requirements}
          onClose={() => setSelectedRequirementId(null)}
          onUpdated={handleRequirementUpdated}
        />
      )}
    </div>
  );
}
