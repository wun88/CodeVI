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

        <div className={styles.divider}><span>또는</span></div>

        <button
          className={styles.googleBtn}
          onClick={authService.redirectToGoogleSignIn}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 계속하기
        </button>
      </div>
    </div>
  );
}
