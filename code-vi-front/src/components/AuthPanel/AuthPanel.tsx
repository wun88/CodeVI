import { useState, type ChangeEvent, type FormEvent } from 'react';
import './AuthPanel.css';
import loginBg from '../../assets/auth/login_bg.png';
import signupBg from '../../assets/auth/signup_bg.png';

interface AuthPanelProps {
  step: 'closed' | 'login' | 'signup';
  onClose: () => void;
  onGoSignup: () => void;
  onGoLogin: () => void;
}

function AuthPanel({ step, onClose, onGoSignup, onGoLogin }: AuthPanelProps) {
  const isOpen = step !== 'closed';
  const isSignup = step === 'signup';

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    userId: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    verifyCode: '',
    emailLocal: '',
    emailHost: '',
    job: '',
  });

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Login submit:', loginForm);
  };

  const handleSignupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Signup submit:', signupForm);
  };

  return (
    <div
      className={['auth-modal', isOpen ? 'open' : '', isSignup ? 'right-panel-active' : ''].join(
        ' ',
      )}
      aria-hidden={!isOpen}
    >
      <div className="auth-modal-backdrop" onClick={onClose} />

      <section className="auth-modal-shell" role="dialog" aria-modal="true" aria-label="Auth">
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        <div
          className="auth-container"
          style={{
            '--auth-bg-image': `url(${isSignup ? signupBg : loginBg})`,
            '--auth-bg-position': isSignup ? 'center' : 'right center',
            '--auth-bg-size': isSignup ? 'cover' : '200% 100%',
            '--auth-overlay-alpha': isSignup ? '0.58' : '0.46',
            '--auth-overlay-blur': isSignup ? '1px' : '0px',
          } as React.CSSProperties}
        >
          <div className="auth-forms-track">
            <div className="auth-form-panel auth-login-panel">
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <h2 className="auth-form-title">Login</h2>
                <p className="auth-form-subtitle">Use your existing account.</p>

                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  autoComplete="email"
                  required
                />

                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  autoComplete="current-password"
                  required
                />

                <button type="submit" className="auth-submit-btn">
                  Login
                </button>

                <button type="button" className="auth-secondary-btn" onClick={onGoSignup}>
                  Sign Up
                </button>

                <div className="auth-social-divider">
                  <span>또는 소셜 계정으로 로그인</span>
                </div>

                <div className="auth-social-buttons">
                  <button
                    type="button"
                    className="auth-social-btn auth-social-github"
                    onClick={() => console.log('GitHub 로그인 클릭')}
                    aria-label="GitHub 로그인"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="auth-social-btn auth-social-google"
                    onClick={() => console.log('Google 로그인 클릭')}
                    aria-label="Google 로그인"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="auth-social-btn auth-social-kakao"
                    onClick={() => console.log('카카오 로그인 클릭')}
                    aria-label="카카오 로그인"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
                      <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.687 1.74 5.043 4.348 6.373-.192.72-.696 2.608-.797 3.013-.123.498.183.49.384.357.158-.105 2.504-1.7 3.518-2.39.847.124 1.72.19 2.547.19 5.523 0 10-3.463 10-7.543C22 6.463 17.523 3 12 3z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="auth-social-btn auth-social-naver"
                    onClick={() => console.log('네이버 로그인 클릭')}
                    aria-label="네이버 로그인"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
                    </svg>
                  </button>
                </div>
              </form>
            </div>

            <div className="auth-form-panel auth-signup-panel">
              <div className="auth-signup-scroll">
                <div className="auth-brand auth-brand--signup">
                  <span>RE:</span>
                  <span>
                    FACT<span className="accent">ORY</span>
                  </span>
                </div>

                <div className="auth-signup-stack">
                  <div className="auth-signup-header">
                    <h2>회원가입</h2>
                    <p>코드를 해부하고 구조를 시각화하고 더 나은 형태로 다시 설계합니다</p>
                  </div>

                  <div className="auth-signup-card">
                    <h3>기본 정보</h3>

                    <form className="auth-signup-form" onSubmit={handleSignupSubmit}>
                    <div className="signup-field">
                      <label htmlFor="su-name">
                        이름 <span>(필수)</span>
                      </label>
                      <input
                        id="su-name"
                        name="name"
                        type="text"
                        placeholder="이름을 입력하세요"
                        value={signupForm.name}
                        onChange={handleSignupChange}
                        autoComplete="name"
                      />
                    </div>

                    <div className="signup-row">
                      <div className="signup-field flex-1">
                        <label htmlFor="su-userid">
                          아이디 <span>(필수)</span>
                        </label>
                        <input
                          id="su-userid"
                          name="userId"
                          type="text"
                          placeholder="8~16자의 영문 대/소문자, 숫자, 특수문자를 사용해주세요"
                          value={signupForm.userId}
                          onChange={handleSignupChange}
                          autoComplete="username"
                        />
                      </div>
                      <button type="button" className="signup-side-btn">
                        중복 확인
                      </button>
                    </div>

                    <div className="signup-field">
                      <label htmlFor="su-password">
                        비밀번호 <span>(필수)</span>
                      </label>
                      <input
                        id="su-password"
                        name="password"
                        type="password"
                        placeholder="8~16자의 영문 대/소문자, 숫자, 특수문자를 사용해주세요"
                        value={signupForm.password}
                        onChange={handleSignupChange}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="signup-field">
                      <label htmlFor="su-password2">
                        비밀번호 확인 <span>(필수)</span>
                      </label>
                      <input
                        id="su-password2"
                        name="passwordConfirm"
                        type="password"
                        placeholder="동일한 비밀번호를 입력하세요"
                        value={signupForm.passwordConfirm}
                        onChange={handleSignupChange}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="signup-row">
                      <div className="signup-field flex-1">
                        <label htmlFor="su-phone">
                          휴대폰 번호 <span>(필수)</span>
                        </label>
                        <input
                          id="su-phone"
                          name="phone"
                          type="text"
                          placeholder="'-' 제외하고 숫자만 입력하세요"
                          value={signupForm.phone}
                          onChange={handleSignupChange}
                          autoComplete="tel"
                        />
                      </div>
                      <button type="button" className="signup-side-btn">
                        인증번호 받기
                      </button>
                    </div>

                    <div className="signup-row">
                      <div className="signup-field flex-1">
                        <label htmlFor="su-code" className="sr-only">
                          인증번호
                        </label>
                        <input
                          id="su-code"
                          name="verifyCode"
                          type="text"
                          placeholder="인증번호 숫자 4자리를 입력하세요"
                          value={signupForm.verifyCode}
                          onChange={handleSignupChange}
                        />
                      </div>
                      <button type="button" className="signup-side-btn">
                        확인
                      </button>
                    </div>

                    <div className="signup-field">
                      <label htmlFor="su-email-local">
                        이메일 주소 <span>(필수)</span>
                      </label>
                      <div className="signup-email-layout">
                        <div className="signup-email-composite">
                          <input
                            id="su-email-local"
                            name="emailLocal"
                            type="text"
                            className="signup-email-id"
                            placeholder="이메일 아이디"
                            value={signupForm.emailLocal}
                            onChange={handleSignupChange}
                            autoComplete="off"
                          />
                          <span className="signup-email-sep signup-at" aria-hidden="true">
                            @
                          </span>
                          <input
                            name="emailHost"
                            type="text"
                            className="signup-email-domain"
                            placeholder="이메일 호스트"
                            value={signupForm.emailHost}
                            onChange={handleSignupChange}
                            autoComplete="off"
                          />
                          <select
                            className="signup-email-select"
                            defaultValue="직접입력"
                            aria-label="이메일 도메인 선택"
                          >
                            <option>직접입력</option>
                            <option>naver.com</option>
                            <option>gmail.com</option>
                            <option>daum.net</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="signup-field">
                      <label htmlFor="su-job">
                        직군 선택 <span>(필수)</span>
                      </label>
                      <select
                        id="su-job"
                        name="job"
                        className="signup-select"
                        value={signupForm.job}
                        onChange={handleSignupChange}
                      >
                        <option value="">옵션을 선택하세요</option>
                        <option value="developer">개발자</option>
                        <option value="designer">디자이너</option>
                        <option value="planner">기획자</option>
                        <option value="general">일반인</option>
                        <option value="etc">기타</option>
                      </select>
                    </div>

                    <div className="signup-actions">
                      <button type="button" className="signup-back-btn" onClick={onGoLogin}>
                        Back
                      </button>
                      <button type="submit" className="auth-primary-btn signup-submit-btn">
                        Sign Up
                      </button>
                    </div>

                    <p className="auth-panel-switch auth-panel-switch--signup">
                      이미 계정이 있으신가요?{' '}
                      <button type="button" className="auth-inline-link" onClick={onGoLogin}>
                        Login
                      </button>
                    </p>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AuthPanel;
