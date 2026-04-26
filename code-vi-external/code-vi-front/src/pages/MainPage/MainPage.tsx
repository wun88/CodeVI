import Header from '../../components/Header';
import HeroContent from '../../components/HeroContent';
import './MainPage.css';

interface MainPageProps {
  onLoginClick?: () => void;
}

function MainPage({ onLoginClick }: MainPageProps) {
  return (
    <div className="main-page">
      <Header onLoginClick={onLoginClick} />

      <section className="hero-section">
        <HeroContent onCtaClick={onLoginClick} />
      </section>
    </div>
  );
}

export default MainPage;
