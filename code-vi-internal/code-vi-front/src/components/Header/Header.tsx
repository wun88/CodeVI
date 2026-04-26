import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import logo from '../../assets/main-page/logo.png';
import './Header.css';

import { authService } from '../../services/authService';

interface HeaderProps {
  onLoginClick?: () => void;
  variant?: 'default' | 'transparent' | 'white' | string;
}

function Header({ onLoginClick, variant = 'default' }: HeaderProps) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'));

    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('accessToken'));
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('accessToken');
    } finally {
      setIsLoggedIn(false);
      window.dispatchEvent(new Event('auth-change'));
      navigate('/');
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLoginClick = () => {
    closeMobileMenu();
    if (onLoginClick) {
      onLoginClick();
    }
  };

  const handleProfileClick = () => {
    navigate('/mypage');
  };

  const homePath = isLoggedIn ? '/dashboard' : '/';

  return (
    <header className={`header header-${variant}`}>
      <div className="header-container">
        <Link to={homePath} className="logo-link">
          <img src={logo} alt="RE:FACTORY CodeVi" className="logo" />
        </Link>

        <button className="hamburger-btn" onClick={toggleMobileMenu} type="button">
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
        </button>

        <nav className={`nav ${isMobileMenuOpen ? 'nav-open' : ''}`}>
          <ul className="nav-list">
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

            {!isLoggedIn ? (
              <li className="nav-item mobile-login">
                <button type="button" className="login-btn" onClick={handleLoginClick}>
                  LOGIN
                </button>
              </li>
            ) : (
              <li className="nav-item mobile-login">
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'center',
                  }}
                >
                  <FaUserCircle
                    size={38}
                    className="profile-icon"
                    onClick={handleProfileClick}
                    style={{ color: '#7492B7', cursor: 'pointer' }}
                  />
                  <button
                    type="button"
                    className="login-btn"
                    style={{ width: '100%', padding: '8px 0' }}
                    onClick={handleLogout}
                  >
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
          <div
            className="desktop-login"
            style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
          >
            <FaUserCircle
              size={38}
              className="profile-icon"
              onClick={handleProfileClick}
              style={{ color: '#7492B7', cursor: 'pointer' }}
            />
            <button
              type="button"
              className="login-btn"
              style={{ marginLeft: '5px' }}
              onClick={handleLogout}
            >
              LOGOUT
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
