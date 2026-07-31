import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../../../components/Header';
import { githubConnectService, type GithubRepositorySummary } from '../../../services/githubConnectService';
import './GitHubConnect.css';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback;
}

function getResponseStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined;
}

/** 409 응답 바디의 teamProjectId(이미 이 job name으로 등록된 실제 프로젝트) 추출 (PR #61 리뷰 #12) */
function getConflictTeamProjectId(err: unknown): number | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const data = err.response?.data as { teamProjectId?: number } | undefined;
  return data?.teamProjectId;
}

type Phase =
  | 'checking'
  | 'disconnected'
  | 'loading_repos'
  | 'repos_error'
  | 'repos_empty'
  | 'repos_loaded';

const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  github_denied: 'GitHub 인증이 취소되었습니다.',
  invalid_state: '연결 요청이 만료되었거나 올바르지 않습니다. 다시 시도해주세요.',
  github_token_missing: 'GitHub 인증 토큰을 받아오지 못했습니다.',
  github_connect_failed: 'GitHub 연결 처리 중 오류가 발생했습니다.',
  github_auth_failed: 'GitHub 인증에 실패했습니다.',
};

function getLanguageColor(language: string | null) {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
  };
  return colors[language ?? ''] || '#666666';
}

function GitHubConnect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // "기존 프로젝트에 코드 연결"(jej_20 Phase 5) — 최초 렌더 시점에 한 번만 읽어 state로 고정한다.
  // OAuth 콜백 후 쿼리스트링을 정리하는 navigate(replace)가 실행돼도 이 값은 사라지지 않아야 한다.
  const [teamProjectId] = useState<number | undefined>(() => {
    const raw = searchParams.get('teamProjectId');
    return raw ? Number(raw) : undefined;
  });

  const [phase, setPhase] = useState<Phase>('checking');
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<GithubRepositorySummary[]>([]);
  const [reposError, setReposError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepositorySummary | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const loadRepositories = async () => {
    setPhase('loading_repos');
    setReposError(null);
    try {
      const repos = await githubConnectService.listRepositories();
      setRepositories(repos);
      setPhase(repos.length === 0 ? 'repos_empty' : 'repos_loaded');
    } catch (err) {
      setReposError(extractErrorMessage(err, '레포지토리를 불러오지 못했습니다.'));
      setPhase('repos_error');
    }
  };

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setConnectError(CONNECT_ERROR_MESSAGES[errorParam] ?? 'GitHub 연결에 실패했습니다.');
    }

    (async () => {
      try {
        const status = await githubConnectService.getConnectionStatus();
        setGithubUsername(status.githubUsername);
        if (status.connected) {
          await loadRepositories();
        } else {
          setPhase('disconnected');
        }
      } catch {
        setPhase('disconnected');
      } finally {
        if (searchParams.get('connected') || errorParam) {
          navigate('/code-insight/github', { replace: true });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = () => {
    githubConnectService.redirectToConnect(teamProjectId);
  };

  const handleDisconnect = async () => {
    if (!window.confirm('GitHub 연결을 해제하시겠습니까?')) return;
    await githubConnectService.disconnect();
    setGithubUsername(null);
    setRepositories([]);
    setSelectedRepo(null);
    setPhase('disconnected');
  };

  const handleRepoSelect = (repo: GithubRepositorySummary) => {
    setSelectedRepo(repo);
    setRegisterError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedRepo) return;
    const [owner, repo] = selectedRepo.fullName.split('/');
    setRegistering(true);
    setRegisterError(null);
    // "기존 프로젝트에 코드 연결"(jej_20 Phase 5) 모드면 등록 후 프로젝트 상세로,
    // 아니면 기존 흐름대로 대시보드로 이동한다.
    const destination = teamProjectId ? `/projects/${teamProjectId}` : '/code-insight/dashboard';
    try {
      await githubConnectService.registerProject(owner, repo, teamProjectId);
      navigate(destination);
    } catch (err) {
      // 이미 등록/연결된 프로젝트면 그 프로젝트 상세로 이동한다 — 백엔드가 409와 함께 돌려주는
      // teamProjectId(이 job name으로 이미 연결된 실제 프로젝트)를 무시하면, "새 프로젝트" 흐름에서
      // destination이 무관한 대시보드라 사용자가 이유 없이 "연결 없음" 화면으로 돌아가 보인다.
      if (getResponseStatus(err) === 409) {
        const existingTeamProjectId = getConflictTeamProjectId(err);
        navigate(existingTeamProjectId ? `/projects/${existingTeamProjectId}` : destination);
        return;
      }
      setRegisterError(extractErrorMessage(err, '프로젝트 등록에 실패했습니다.'));
      setRegistering(false);
    }
  };

  return (
    <div className="github-connect-page">
      <Header variant="internal" />
      <main className="github-connect-content">
        <button className="back-btn" onClick={() => navigate('/code-insight')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>

        <div className="github-connect-header">
          <h1>GitHub 연동</h1>
          <p>
            GitHub 계정을 연결하여 레포지토리를 분석하세요
            {githubUsername ? ` · 연결됨 (@${githubUsername})` : ''}
          </p>
        </div>

        {connectError && phase === 'disconnected' && (
          <p style={{ textAlign: 'center', color: '#e5484d', marginBottom: 16 }}>{connectError}</p>
        )}

        {phase === 'checking' && (
          <div className="github-connect-card">
            <p>연결 상태를 확인하는 중...</p>
          </div>
        )}

        {phase === 'disconnected' && (
          <div className="github-connect-card">
            <div className="github-logo">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="#222222">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <h2>GitHub 계정 연결</h2>
            <p>레포지토리 목록을 가져오려면 GitHub 계정을 연결하세요</p>
            <button className="github-connect-btn" onClick={handleConnect}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub으로 연결
            </button>
          </div>
        )}

        {(phase === 'loading_repos' ||
          phase === 'repos_error' ||
          phase === 'repos_empty' ||
          phase === 'repos_loaded') && (
          <div className="repository-section">
            <div className="repo-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>레포지토리 선택</h2>
                <p>분석할 레포지토리를 선택하세요</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="back-btn" onClick={loadRepositories} style={{ marginBottom: 0 }}>
                  새로고침
                </button>
                <button className="back-btn" onClick={handleDisconnect} style={{ marginBottom: 0 }}>
                  연결 해제
                </button>
              </div>
            </div>

            {phase === 'loading_repos' && <p>레포지토리를 불러오는 중...</p>}

            {phase === 'repos_error' && (
              <div>
                <p style={{ color: '#e5484d' }}>{reposError}</p>
                <button className="github-connect-btn" onClick={loadRepositories}>
                  다시 시도
                </button>
              </div>
            )}

            {phase === 'repos_empty' && <p>접근 가능한 레포지토리가 없습니다. GitHub에서 저장소 접근 권한을 확인하세요.</p>}

            {phase === 'repos_loaded' && (
              <>
                <div className="repository-list">
                  {repositories.map((repo) => (
                    <div
                      key={repo.id}
                      className={`repository-item ${selectedRepo?.id === repo.id ? 'selected' : ''}`}
                      onClick={() => handleRepoSelect(repo)}
                    >
                      <div className="repo-info">
                        <h3 className="repo-name">
                          {repo.name}
                          {repo.private && ' 🔒'}
                        </h3>
                        <p className="repo-description">{repo.description || '설명 없음'}</p>
                        <div className="repo-meta">
                          {repo.language && (
                            <span className="repo-language">
                              <span className="language-dot" style={{ backgroundColor: getLanguageColor(repo.language) }}></span>
                              {repo.language}
                            </span>
                          )}
                          <span className="repo-stars">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            {repo.stargazersCount}
                          </span>
                          <span className="repo-updated">업데이트: {new Date(repo.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="repo-select-indicator">
                        {selectedRepo?.id === repo.id && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#7492B7">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {registerError && <p style={{ color: '#e5484d', marginTop: 12 }}>{registerError}</p>}

                {selectedRepo && (
                  <button className="analyze-btn" onClick={handleAnalyze} disabled={registering}>
                    {registering ? '프로젝트 등록 중...' : `${selectedRepo.name} 분석 시작`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default GitHubConnect;
