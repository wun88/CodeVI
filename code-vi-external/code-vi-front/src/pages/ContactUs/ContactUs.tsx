import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import './ContactUs.css';
import contactImage from '../../assets/contactus-page/contact-illustration.png';
import footerBg from '../../assets/contactus-page/contact-bg.png';

function ContactUs() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 검증: 필수 필드 확인
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.message) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    // 메일 제목과 본문 구성
    const subject = `${formData.firstName} ${formData.lastName}님의 메시지`;
    const body = `보낸 사람: ${formData.firstName} ${formData.lastName}\n이메일: ${formData.email}\n\n메시지:\n${formData.message}`;
    
    // mailto 링크 생성
    const mailtoLink = `mailto:iamjack0416@naver.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // 메일 클라이언트 열기
    window.location.href = mailtoLink;
    
    // 폼 초기화
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      message: ''
    });
  };

  const footerRef = useRef(null);

  return (
    <div className="contact-us-page">
      <Header />
      <main className="contact-container">
        <div className="contact-wrapper">
          <div className="contact-form-section">
            <h1 className="contact-title">Contact Us</h1>
            <div className="contact-right">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder=""
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder=""
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder=""
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder=""
                rows="6"
              ></textarea>
            </div>

            <button type="submit" className="submit-btn">Send Message</button>
          </form>
            </div>
          </div>

          <div className="contact-image-section">
            <img src={contactImage} alt="Contact Us Illustration" className="contact-illustration" />
          </div>
        </div>

        <section className="contact-footer" ref={footerRef}>
          <div className="footer-white-box">
            <div className="footer-logo-overlay">
              <img src={footerBg} alt="RE:FACTORY Logo" className="footer-logo-img-large" />
            </div>

            <div className="footer-content-flex">
              <div className="footer-brand-col">
                <div className="footer-logo-text">
                  <span className="footer-logo-re">RE:</span>
                  <span className="footer-logo-factory">FACT<span className="footer-logo-ory">ORY</span></span>
                </div>
                <p className="footer-tagline">Analyze. Visualize. Refactor.</p>
              </div>

              <div className="footer-contact-col">
                <h2>Contact Us</h2>
                <div className="footer-contact-details">
                  <p>refactory@hongik.ac.kr</p>
                  <p>
                    Hongik University,<br />
                    Jochiwon-eup Sejong-si 30016
                  </p>
                  <p>044-860-2114</p>
                </div>
              </div>

              <div className="footer-right-col">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-link"
                  aria-label="GitHub"
                >
                  <svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>GitHub</span>
                </a>

                <div className="footer-social-links">
                  <a
                    href="https://www.instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-link"
                  >
                    <svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm10.5 1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
                    </svg>
                    <span>Instagram</span>
                  </a>
                  <a
                    href="https://www.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-link"
                  >
                    <svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
                    </svg>
                    <span>Facebook</span>
                  </a>
                  <a
                    href="https://www.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-link"
                  >
                    <svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 11h8.533c.044.385.067.78.067 1.184C20.6 17.48 17.048 21 12 21c-4.971 0-9-4.029-9-9s4.029-9 9-9c2.395 0 4.565.942 6.18 2.48L16.003 7.66A6.01 6.01 0 0012 6c-3.314 0-6 2.686-6 6s2.686 6 6 6c3.012 0 5.297-1.951 5.88-4.546L12 13.5V11z"/>
                    </svg>
                    <span>Google</span>
                  </a>
                </div>
              </div>
            </div>

            <p className="footer-copyright">© {new Date().getFullYear()} RE:FACTORY</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ContactUs;