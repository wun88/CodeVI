import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import logo from '../../assets/main-page/logo.png';
import './Header.css';

function Header({ onLoginClick, variant = "default" }) {
  const navigate = useNavigate();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Initial check
    setIsLoggedIn(!!localStorage.getItem('accessToken'));

    // Listen to storage changes in case login happens in another tab or we trigger a custom event
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('accessToken'));
    };
    window.addEventListener('storage', handleStorageChange);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('storage', handleStorageChange);
    };
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

  const handleProfileClick = () => {
    navigate('/dashboard'); // Go to dashboard, or can be a profile page
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

            {isLoggedIn && (
              <li className="nav-item">
                <Link to="/dashboard" className="nav-link" onClick={closeMobileMenu}>
                  Dashboard
                </Link>
              </li>
            )}

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

            {!isLoggedIn ? (
              <li className="nav-item mobile-login">
                <button type="button" className="login-btn" onClick={handleLoginClick}>
                  LOGIN
                </button>
              </li>
            ) : (
              <li className="nav-item mobile-login">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <FaUserCircle 
                    size={38} 
                    className="profile-icon" 
                    onClick={handleProfileClick}
                    style={{ color: '#8b8df1', cursor: 'pointer' }}
                  />
                </div>
              </li>
            )}

          </ul>
        </nav>

        {!isLoggedIn ? (
          <button type="button" className="login-btn desktop-login" onClick={handleLoginClick}>
            LOGIN
          </button>
        ) : (
          <div className="desktop-login">
            <FaUserCircle 
              size={38} 
              className="profile-icon" 
              onClick={handleProfileClick}
              style={{ color: '#8b8df1', cursor: 'pointer' }}
            />
          </div>
        )}
      </div>

    </header>
  );
}

export default Header;