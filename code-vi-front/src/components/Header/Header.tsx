import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/main-page/logo.png';
import './Header.css';

function Header({ onLoginClick, onLogout, variant = 'default' }) {

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsMoreOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    timeoutRef.current = setTimeout(() => {
      setIsMoreOpen(false);
    }, 200);
  };

  const handleMoreClick = () => {
    if (isMobile) {
      setIsMoreOpen(!isMoreOpen);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsMoreOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMoreOpen(false);
  };

  const handleLoginClick = () => {
    closeMobileMenu();
    if (onLoginClick) {
      onLoginClick();
    }
  };

  return (
    <header className={`header header-${variant}`}>

      <div className="header-container">

        <Link to="/" className="logo-link">
          <img src={logo} alt="RE:FACTORY" className="logo" />
        </Link>

        <button className="hamburger-btn" onClick={toggleMobileMenu} type="button">
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
        </button>

        <nav className={`nav ${isMobileMenuOpen ? 'nav-open' : ''}`}>
          <ul className="nav-list">

            <li className="nav-item">
              <Link to="/about-us" className="nav-link" onClick={closeMobileMenu}>
                About Us
              </Link>
            </li>

            <li className="nav-item">
              <Link to="/code-insight" className="nav-link" onClick={closeMobileMenu}>
                Code Insight
              </Link>
            </li>

            <li
              className={`nav-item has-dropdown ${isMoreOpen ? 'dropdown-open' : ''}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button type="button" className="nav-link dropdown-toggle" onClick={handleMoreClick}>
                More
                <span className={`dropdown-arrow ${isMoreOpen ? 'arrow-open' : ''}`}>▼</span>
              </button>

              {isMoreOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="/faq" className="dropdown-link" onClick={closeMobileMenu}>
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link to="/community" className="dropdown-link" onClick={closeMobileMenu}>
                      Community
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact-us" className="dropdown-link" onClick={closeMobileMenu}>
                      Contact Us
                    </Link>
                  </li>
                </ul>
              )}

            </li>

            <li className="nav-item mobile-login">
              {onLogout ? (
                <button
                  type="button"
                  className="logout-btn"
                  onClick={() => {
                    closeMobileMenu();
                    onLogout();
                  }}
                >
                  LOGOUT
                </button>
              ) : (
                <button type="button" className="login-btn" onClick={handleLoginClick}>
                  LOGIN
                </button>
              )}
            </li>

          </ul>
        </nav>

        {onLogout ? (
          <button type="button" className="logout-btn desktop-login" onClick={onLogout}>
            LOGOUT
          </button>
        ) : (
          <button type="button" className="login-btn desktop-login" onClick={handleLoginClick}>
            LOGIN
          </button>
        )}
      </div>

    </header>
  );
}

export default Header;