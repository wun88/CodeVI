import './HeroContent.css';

const INTERNAL_PLATFORM_URL =
  import.meta.env.VITE_INTERNAL_URL ?? 'http://localhost:5174';

interface HeroContentProps {
  onCtaClick?: () => void;
}

function HeroContent({ onCtaClick }: HeroContentProps) {
  const handleClick = () => {
    if (onCtaClick) {
      onCtaClick();
      return;
    }
    window.location.href = INTERNAL_PLATFORM_URL;
  };

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
      <button type="button" className="hero-cta-btn" onClick={handleClick}>
        코드 진단하기
      </button>
    </div>
  );
}

export default HeroContent;
