import "./AboutRefactory.css";
import logo from "../../assets/aboutus-page/logo_dark.gif";

function AboutRefactory() {
  return (
    <section className="about-refactory">

      <div className="hero-container">

        <img 
          src={logo} 
          alt="RE;Factory Logo" 
          className="logo_gif"
        />

        <h1 className="title">
          RE : FACTORY
        </h1>

        <p className="description">
          RE : FACTORY는 기존 정적 분석 도구의 한계를 넘어
          <span>LLM 기반 의미 분석</span>을 통해 <br />코드 품질을 평가하고  
          개발자가 이해하기 쉬운 <span>리팩토링 방향</span>을 제시합니다.
        </p>

        <div className="hero-nav-cards">
          <a href="#why-refactory" className="hero-nav-card">
            <span className="nav-icon">❓</span>
            <span className="nav-text">Why RE:FACTORY</span>
          </a>
          <a href="#key-features" className="hero-nav-card">
            <span className="nav-icon">✨</span>
            <span className="nav-text">Key Features</span>
          </a>
          <a href="#our-values" className="hero-nav-card">
            <span className="nav-icon">💎</span>
            <span className="nav-text">Our Values</span>
          </a>
        </div>

      </div>

    </section>
  );
}

export default AboutRefactory;