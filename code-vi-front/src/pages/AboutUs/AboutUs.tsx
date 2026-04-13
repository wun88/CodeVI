import Header from '../../components/Header';
import './AboutUs.css';

import AboutRefactory from './AboutRefactory';
import WhyRefactory from './WhyRefactory';
import KeyFeatures from './KeyFeatures';
import OurValues from './OurValues';

export default function AboutUs() {
  return (
    <div className="about-container">

      <Header />

      {/* About RE:FACTORY */}
      <section className="about-section" id="about-refactory">
        <AboutRefactory />
      </section>

      {/* Why RE:FACTORY */}
      <section className="about-section" id="why-refactory">
        <WhyRefactory />
      </section>

      {/* Key Features */}
      <section className="about-section" id="key-features">
        <KeyFeatures />
      </section>

      {/* Our Values */}
      <section className="about-section" id="our-values">
        <OurValues />
      </section>

    </div>  
  );
}