import Header from '../../components/Header'
import HeroContent from '../../components/HeroContent'
import './MainPage.css'

function MainPage({ onLoginClick }) {

  return (
    <div className="main-page">

      <Header onLoginClick={onLoginClick}/>

      <section className="hero-section">
        <HeroContent/>
      </section>

    </div>
  )
}

export default MainPage