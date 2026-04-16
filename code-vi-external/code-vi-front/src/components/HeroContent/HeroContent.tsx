import { Link } from 'react-router-dom';
import './HeroContent.css';

function HeroContent() {
  return (
    <div className="hero-content">
      <h1 className="hero-title">RE:FACTORY</h1>
      <p className="hero-subtitle">Analyze. Visualize. Refactor.</p>
      <p className="hero-description">
        코드를 해부하고
        <br />
        구조를 시각화하고
        <br />
        더 나은 형태로 다시 설계합니다.
      </p>
      <Link to="/code-insight" className="hero-cta-btn">
        코드 진단하기
      </Link>
    </div>
  );
}

export default HeroContent;
