import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import ProjectOnboardingPanel from '../../../components/ProjectOnboardingPanel/ProjectOnboardingPanel';
import './OnboardingPage.css';

function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="onboarding-page">
      <Header />
      <main className="onboarding-content">
        <button className="back-btn" onClick={() => navigate('/code-insight')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          돌아가기
        </button>

        <div className="onboarding-header">
          <h1>프로젝트 온보딩</h1>
          <p>분석할 레포지토리의 URL과 액세스 토큰(PAT)을 입력하세요</p>
        </div>

        <div className="onboarding-container">
          <ProjectOnboardingPanel />
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;
