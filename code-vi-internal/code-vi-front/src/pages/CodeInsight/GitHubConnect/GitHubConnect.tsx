import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import './GitHubConnect.css';

// 더미 데이터
const dummyRepositories = [
  { id: 1, name: 'my-react-app', description: 'A sample React application', language: 'JavaScript', stars: 12, updatedAt: '2024-03-05' },
  { id: 2, name: 'backend-api', description: 'REST API backend service', language: 'Python', stars: 8, updatedAt: '2024-03-01' },
  { id: 3, name: 'portfolio-website', description: 'Personal portfolio site', language: 'TypeScript', stars: 5, updatedAt: '2024-02-28' },
  { id: 4, name: 'data-analysis', description: 'Data analysis scripts', language: 'Python', stars: 3, updatedAt: '2024-02-20' },
];

function GitHubConnect() {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGitHubConnect = () => {
    setIsConnecting(true);
    // 연결 시뮬레이션
    setTimeout(() => {
      setIsConnected(true);
      setIsConnecting(false);
    }, 1500);
  };

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
  };

  const handleAnalyze = () => {
    navigate('/code-insight/dashboard');
  };

  const getLanguageColor = (language) => {
    const colors = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      Java: '#b07219',
      'C++': '#f34b7d',
    };
    return colors[language] || '#666666';
  };

  return (
    <div className="github-connect-page">
      <Header />
      <main className="github-connect-content">
        <button className="back-btn" onClick={() => navigate('/code-insight')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          돌아가기
        </button>

        <div className="github-connect-header">
          <h1>GitHub 연동</h1>
          <p>GitHub 계정을 연결하여 레포지토리를 분석하세요</p>
        </div>

        {!isConnected ? (
          <div className="github-connect-card">
            <div className="github-logo">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="#222222">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <h2>GitHub 계정 연결</h2>
            <p>레포지토리 목록을 가져오려면 GitHub 계정을 연결하세요</p>
            <button
              className="github-connect-btn"
              onClick={handleGitHubConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="connecting">
                  <span className="spinner"></span>
                  연결 중...
                </span>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub으로 연결
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="repository-section">
            <div className="repo-section-header">
              <h2>레포지토리 선택</h2>
              <p>분석할 레포지토리를 선택하세요</p>
            </div>

            <div className="repository-list">
              {dummyRepositories.map((repo) => (
                <div
                  key={repo.id}
                  className={`repository-item ${selectedRepo?.id === repo.id ? 'selected' : ''}`}
                  onClick={() => handleRepoSelect(repo)}
                >
                  <div className="repo-info">
                    <h3 className="repo-name">{repo.name}</h3>
                    <p className="repo-description">{repo.description}</p>
                    <div className="repo-meta">
                      <span className="repo-language">
                        <span
                          className="language-dot"
                          style={{ backgroundColor: getLanguageColor(repo.language) }}
                        ></span>
                        {repo.language}
                      </span>
                      <span className="repo-stars">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        {repo.stars}
                      </span>
                      <span className="repo-updated">업데이트: {repo.updatedAt}</span>
                    </div>
                  </div>
                  <div className="repo-select-indicator">
                    {selectedRepo?.id === repo.id && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#7492B7">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedRepo && (
              <button className="analyze-btn" onClick={handleAnalyze}>
                {selectedRepo.name} 분석 시작
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default GitHubConnect;
