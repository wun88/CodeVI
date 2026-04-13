import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// --- App.jsx Imports ---
import MainPage from './pages/MainPage';
import AboutUs from './pages/AboutUs';
import CodeInsight from './pages/CodeInsight';
import ZipUpload from './pages/CodeInsight/ZipUpload';
import GitHubConnect from './pages/CodeInsight/GitHubConnect';
import Dashboard from './pages/CodeInsight/Dashboard';
import FAQ from './pages/FAQ';
import Community from './pages/Community';
import ContactUs from './pages/ContactUs';
import AuthPanel from './components/AuthPanel/AuthPanel';

import LoginPage from './pages/LoginPage/LoginPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import VisualizationPage from './pages/VisualizationPage/VisualizationPage';
import MyPage from './pages/MyPage/MyPage';

/** 인증 가드 — JWT 토큰이 없으면 /login으로 리디렉트 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  // UI 디자인 테스트를 위해 임시로 인증 체크 비계
  // const token = localStorage.getItem('accessToken');
  // if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [authStep, setAuthStep] = useState<string>('closed'); // closed | login | signup

  const openLogin = () => {
    setAuthStep('login');
  };

  const goSignup = () => {
    setAuthStep('signup');
  };

  const goLogin = () => {
    setAuthStep('login');
  };

  const closeAuth = () => {
    setAuthStep('closed');
  };

  useEffect(() => {
    if (authStep === 'closed') {
      document.body.style.overflow = 'auto';
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [authStep]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="app-shell">
        <div
          className={[
            'main-wrapper',
            authStep === 'login' ? 'login-open' : '',
            authStep === 'signup' ? 'signup-open' : '',
          ].join(' ')}
        >
          <Routes>
            {/* --- App.jsx Routes --- */}
            <Route path="/" element={<MainPage onLoginClick={openLogin} />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/code-insight" element={<CodeInsight />} />
            <Route path="/code-insight/upload" element={<ZipUpload />} />
            <Route path="/code-insight/github" element={<GitHubConnect />} />
            <Route path="/code-insight/dashboard" element={<Dashboard />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/community" element={<Community />} />
            <Route path="/contact-us" element={<ContactUs />} />
            

            {/* --- App.tsx Routes --- */}
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/mypage"
              element={
                <PrivateRoute>
                  <MyPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/visualization/:snapshotId"
              element={
                <PrivateRoute>
                  <VisualizationPage />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* --- App.jsx AuthPanel --- */}
        <AuthPanel
          step={authStep}
          onClose={closeAuth}
          onGoSignup={goSignup}
          onGoLogin={goLogin}
        />
      </div>
    </BrowserRouter>
  );
}
