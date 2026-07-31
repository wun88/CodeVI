import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import './CodeInsight.css';

function CodeInsight() {
  const navigate = useNavigate();

  return (
    <div className="code-insight-page">
      <Header variant="internal" />
      <main className="code-insight-content">
        <div className="code-insight-header">
          <h1>Code Insight</h1>
          <p>분석 모드를 선택해 RE:FACTORY 워크스페이스로 진입하세요</p>
        </div>

        <h2 className="upload-section-title">분석 모드 선택</h2>

        <div className="upload-options insight-modes">
          <div
            className="upload-card mode-card"
            onClick={() => navigate('/code-insight/instant')}
          >
            <div className="upload-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7492B7" strokeWidth="2">
                <path d="M4 7h16M4 12h10M4 17h14" />
              </svg>
            </div>
            <h3>Instant Insight</h3>
            <p className="upload-card-desc">
              코드 스니펫을 붙여넣고
              <br />즉시 미리보기 분석을 확인합니다
            </p>
            <ul className="upload-features">
              <li>
                <span className="check-icon">✓</span>
                빠른 구조/품질 요약
              </li>
              <li>
                <span className="check-icon">✓</span>
                API 연동 전 UI 흐름 제공
              </li>
              <li>
                <span className="check-icon">✓</span>
                워크스페이스 톤 유지
              </li>
            </ul>
          </div>

          <div
            className="upload-card mode-card"
            onClick={() => navigate('/code-insight/project')}
          >
            <div className="upload-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#7492B7">
                <path d="M4 4h16v6H4V4zm0 10h10v6H4v-6zm12 0h4v6h-4v-6z" />
              </svg>
            </div>
            <h3>Project Analysis</h3>
            <p className="upload-card-desc">
              ZIP 업로드 또는 GitHub 연동으로
              <br />프로젝트 단위 분석을 진행합니다
            </p>
            <ul className="upload-features">
              <li>
                <span className="check-icon">✓</span>
                기존 업로드/연동 기능 유지
              </li>
              <li>
                <span className="check-icon">✓</span>
                대시보드/시각화로 연결
              </li>
              <li>
                <span className="check-icon">✓</span>
                내부 워크스페이스 톤 통일
              </li>
            </ul>
          </div>

          <div
            className="upload-card mode-card"
            onClick={() => navigate('/code-insight/new')}
          >
            <div className="upload-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7492B7" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </div>
            <div className="mode-card-title-row">
              <h3>새 프로젝트 시작하기</h3>
              <span className="new-badge">NEW</span>
            </div>
            <p className="upload-card-desc">
              코드 없이 요구사항부터 — AI와 함께 기획을 정리하고, 나중에 코드를 연결
            </p>
            <ul className="upload-features">
              <li>
                <span className="check-icon">✓</span>
                자연어로 요구사항 입력
              </li>
              <li>
                <span className="check-icon">✓</span>
                추후 코드 연결 시 자동 매핑
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CodeInsight;
