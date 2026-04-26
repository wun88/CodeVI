import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import './Dashboard.css';

// 더미 분석 데이터
const analysisData = {
  projectName: 'my-react-app',
  totalFiles: 156,
  totalLines: 12450,
  languages: [
    { name: 'JavaScript', percentage: 65, color: '#f1e05a' },
    { name: 'CSS', percentage: 25, color: '#563d7c' },
    { name: 'HTML', percentage: 10, color: '#e34c26' },
  ],
  codeQuality: {
    score: 78,
    grade: 'B+',
  },
  issues: {
    critical: 2,
    warning: 15,
    info: 28,
  },
  metrics: [
    { label: '코드 복잡도', value: '중간', status: 'warning' },
    { label: '중복 코드', value: '5.2%', status: 'good' },
    { label: '테스트 커버리지', value: '62%', status: 'warning' },
    { label: '문서화 수준', value: '낮음', status: 'critical' },
  ],
  recentIssues: [
    { type: 'critical', message: 'Unused variable in UserProfile.jsx:45', file: 'UserProfile.jsx' },
    { type: 'warning', message: 'Function complexity exceeds threshold', file: 'utils/helpers.js' },
    { type: 'warning', message: 'Missing prop validation', file: 'components/Card.jsx' },
    { type: 'info', message: 'Consider using optional chaining', file: 'api/client.js' },
  ],
};

function Dashboard() {
  const navigate = useNavigate();

  const getStatusClass = (status) => {
    const classes = {
      good: 'status-good',
      warning: 'status-warning',
      critical: 'status-critical',
    };
    return classes[status] || '';
  };

  const getIssueIcon = (type) => {
    if (type === 'critical') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#e74c3c">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      );
    } else if (type === 'warning') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#f39c12">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#3498db">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    );
  };

  return (
    <div className="dashboard-page">
      <Header />
      <main className="dashboard-content">
        <div className="dashboard-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/code-insight')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              돌아가기
            </button>
            <h1>{analysisData.projectName}</h1>
            <p className="project-stats">
              {analysisData.totalFiles}개 파일 · {analysisData.totalLines.toLocaleString()}줄
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* 코드 품질 점수 */}
          <div className="dashboard-card quality-card">
            <h2>코드 품질 점수</h2>
            <div className="quality-score">
              <div className="score-circle">
                <span className="score-value">{analysisData.codeQuality.score}</span>
                <span className="score-grade">{analysisData.codeQuality.grade}</span>
              </div>
            </div>
            <div className="quality-bar">
              <div
                className="quality-fill"
                style={{ width: `${analysisData.codeQuality.score}%` }}
              ></div>
            </div>
          </div>

          {/* 언어 분포 */}
          <div className="dashboard-card languages-card">
            <h2>언어 분포</h2>
            <div className="language-bars">
              {analysisData.languages.map((lang) => (
                <div key={lang.name} className="language-item">
                  <div className="language-info">
                    <span
                      className="language-dot"
                      style={{ backgroundColor: lang.color }}
                    ></span>
                    <span className="language-name">{lang.name}</span>
                  </div>
                  <div className="language-bar">
                    <div
                      className="language-fill"
                      style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                    ></div>
                  </div>
                  <span className="language-percentage">{lang.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 이슈 요약 */}
          <div className="dashboard-card issues-card">
            <h2>이슈 요약</h2>
            <div className="issues-summary">
              <div className="issue-stat critical">
                <span className="issue-count">{analysisData.issues.critical}</span>
                <span className="issue-label">심각</span>
              </div>
              <div className="issue-stat warning">
                <span className="issue-count">{analysisData.issues.warning}</span>
                <span className="issue-label">경고</span>
              </div>
              <div className="issue-stat info">
                <span className="issue-count">{analysisData.issues.info}</span>
                <span className="issue-label">정보</span>
              </div>
            </div>
          </div>

          {/* 주요 지표 */}
          <div className="dashboard-card metrics-card">
            <h2>주요 지표</h2>
            <div className="metrics-list">
              {analysisData.metrics.map((metric, index) => (
                <div key={index} className="metric-item">
                  <span className="metric-label">{metric.label}</span>
                  <span className={`metric-value ${getStatusClass(metric.status)}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 최근 이슈 */}
          <div className="dashboard-card recent-issues-card">
            <h2>최근 이슈</h2>
            <div className="issues-list">
              {analysisData.recentIssues.map((issue, index) => (
                <div key={index} className="issue-item">
                  <div className="issue-icon">{getIssueIcon(issue.type)}</div>
                  <div className="issue-content">
                    <p className="issue-message">{issue.message}</p>
                    <span className="issue-file">{issue.file}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
