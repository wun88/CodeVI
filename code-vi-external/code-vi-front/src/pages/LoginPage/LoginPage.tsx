import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({ teamName: '', jenkinsJobName: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await authService.signup({
          teamName: form.teamName,
          jenkinsJobName: form.jenkinsJobName,
          password: form.password,
        });
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('cv_teamName', form.teamName);
        if (form.jenkinsJobName) localStorage.setItem('cv_jobName', form.jenkinsJobName);
      } else {
        const res = await authService.signin({
          teamName: form.teamName,
          password: form.password,
        });
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('cv_teamName', form.teamName);
      }
      navigate('/dashboard');
    } catch {
      setError('인증에 실패했습니다. 정보를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <h1 className={styles.logoText}>Code Visualizer</h1>
        </div>
        <p className={styles.subtitle}>코드 구조를 시각적으로 탐색하세요</p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'signin' ? styles.activeTab : ''}`}
            onClick={() => setMode('signin')}
          >
            로그인
          </button>
          <button
            className={`${styles.tab} ${mode === 'signup' ? styles.activeTab : ''}`}
            onClick={() => setMode('signup')}
          >
            회원가입
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>팀 이름</label>
            <input
              className={styles.input}
              name="teamName"
              placeholder="예: team-alpha"
              value={form.teamName}
              onChange={handleChange}
              required
            />
          </div>

          {mode === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label}>Jenkins Job 이름</label>
              <input
                className={styles.input}
                name="jenkinsJobName"
                placeholder="예: my-pipeline-job"
                value={form.jenkinsJobName}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>비밀번호</label>
            <input
              className={styles.input}
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? (
              <span className={styles.btnSpinner} />
            ) : (
              mode === 'signin' ? '로그인' : '회원가입'
            )}
          </button>
        </form>

        <div className={styles.divider}><span>또는 소셜 계정으로 로그인</span></div>

        <div className={styles.socialButtons}>
          <button
            className={styles.githubBtn}
            onClick={() => authService.redirectToGithubSignIn()}
            type="button"
            aria-label="GitHub 로그인"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </button>

          <button
            className={styles.googleBtn}
            onClick={() => console.log('Google 로그인 클릭')}
            type="button"
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
            className={styles.kakaoBtn}
            onClick={() => console.log('카카오 로그인 클릭')}
            type="button"
            aria-label="카카오 로그인"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.687 1.74 5.043 4.348 6.373-.192.72-.696 2.608-.797 3.013-.123.498.183.49.384.357.158-.105 2.504-1.7 3.518-2.39.847.124 1.72.19 2.547.19 5.523 0 10-3.463 10-7.543C22 6.463 17.523 3 12 3z"/>
            </svg>
          </button>

          <button
            className={styles.naverBtn}
            onClick={() => console.log('네이버 로그인 클릭')}
            type="button"
            aria-label="네이버 로그인"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
