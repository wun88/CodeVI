import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import './CodeInsight.css';

function CodeInsight() {
  const navigate = useNavigate();

  return (
    <div className="code-insight-page">
      <Header />
      <main className="code-insight-content">
        <div className="code-insight-header">
          <h1>Code Insight</h1>
          <p>코드를 분석하고 시각화하기 위해 프로젝트를 업로드하세요</p>
        </div>

        <h2 className="upload-section-title">업로드 방법 선택</h2>

        <div className="upload-options">
          <div
            className="upload-card"
            onClick={() => navigate('/code-insight/upload')}
          >
            <div className="upload-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7492B7" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3>ZIP 파일 업로드</h3>
            <p className="upload-card-desc">
              프로젝트 폴더를 ZIP 파일로 압축하여
              <br />
              직접 업로드합니다
            </p>
            <ul className="upload-features">
              <li>
                <span className="check-icon">✓</span>
                최대 100MB 파일 지원
              </li>
              <li>
                <span className="check-icon">✓</span>
                빠른 업로드 속도
              </li>
              <li>
                <span className="check-icon">✓</span>
                오프라인 프로젝트 지원
              </li>
            </ul>
          </div>

          <div
            className="upload-card"
            onClick={() => navigate('/code-insight/github')}
          >
            <div className="upload-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#7492B7">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <h3>GitHub 연동</h3>
            <p className="upload-card-desc">
              GitHub 계정을 연결하여
              <br />
              레포지토리를 가져옵니다
            </p>
            <ul className="upload-features">
              <li>
                <span className="check-icon">✓</span>
                실시간 동기화 가능
              </li>
              <li>
                <span className="check-icon">✓</span>
                브랜치 선택 지원
              </li>
              <li>
                <span className="check-icon">✓</span>
                커밋 히스토리 분석
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CodeInsight;
