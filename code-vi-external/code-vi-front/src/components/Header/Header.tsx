import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import logo from '../../assets/main-page/logo.png';
import './Header.css';

import { authService } from '../../services/authService';

interface HeaderProps {
  onLoginClick?: () => void;
  variant?: 'default' | 'transparent' | 'white' | string;
}

function Header({ onLoginClick, variant = "default" }: HeaderProps) {
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Initial check
    setIsLoggedIn(!!localStorage.getItem('accessToken'));

    // Listen to storage changes
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('accessToken'));
    };
    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab login/logout
    window.addEventListener('auth-change', handleStorageChange);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      navigate('/');
      // Trigger event for other components if needed
      window.dispatchEvent(new Event('auth-change'));
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if backend fails, clear local state
      localStorage.removeItem('accessToken');
      setIsLoggedIn(false);
      navigate('/');
    }
  };

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
    navigate('/mypage'); // Go to mypage instead of dashboard
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

            {!isLoggedIn ? (
              <li className="nav-item mobile-login">
                <button type="button" className="login-btn" onClick={handleLoginClick}>
                  LOGIN
                </button>
              </li>
            ) : (
              <li className="nav-item mobile-login">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                    <button type="button" className="dashboard-btn" style={{ width: 'auto' }} onClick={() => { closeMobileMenu(); navigate('/dashboard'); }}>
                      Dashboard
                    </button>
                    <FaUserCircle
                      size={38}
                      className="profile-icon"
                      onClick={handleProfileClick}
                      style={{ color: '#7492B7', cursor: 'pointer' }}
                    />
                  </div>
                  <button type="button" className="login-btn" style={{ width: '100%', padding: '8px 0' }} onClick={handleLogout}>
                    LOGOUT
                  </button>
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
          <div className="desktop-login" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button type="button" className="dashboard-btn" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
            <FaUserCircle
              size={38}
              className="profile-icon"
              onClick={handleProfileClick}
              style={{ color: '#7492B7', cursor: 'pointer' }}
            />
            <button type="button" className="login-btn" style={{ marginLeft: '5px' }} onClick={handleLogout}>
              LOGOUT
            </button>
          </div>
        )}
      </div>

    </header>
  );
}

export default Header;