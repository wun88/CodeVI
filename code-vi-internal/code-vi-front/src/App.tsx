import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

import CodeInsight from './pages/CodeInsight';
import InstantInsight from './pages/CodeInsight/InstantInsight';
import ProjectAnalysis from './pages/CodeInsight/ProjectAnalysis';
import ZipUpload from './pages/CodeInsight/ZipUpload';
import ZipResult from './pages/CodeInsight/ZipResult';
import GitHubConnect from './pages/CodeInsight/GitHubConnect';
import Dashboard from './pages/CodeInsight/Dashboard';
import OnboardingPage from './pages/CodeInsight/Onboarding/OnboardingPage';
import NewProject from './pages/CodeInsight/NewProject/NewProject';
import NewRequirement from './pages/CodeInsight/NewRequirement/NewRequirement';

import AuthPanel from './components/AuthPanel/AuthPanel';

import DashboardPage from './pages/DashboardPage/DashboardPage';
import VisualizationPage from './pages/VisualizationPage/VisualizationPage';
import MyPage from './pages/MyPage/MyPage';
import GithubCallback from './pages/GithubCallback/GithubCallback';
import GoogleCallback from './pages/GoogleCallback/GoogleCallback';
import KakaoCallback from './pages/KakaoCallback/KakaoCallback';
import NaverCallback from './pages/NaverCallback/NaverCallback';
import InternalHome from './pages/InternalHome/InternalHome';
import MyProjects from './pages/MyProjects/MyProjects';
import ProjectDetail from './pages/ProjectDetail/ProjectDetail';

/** 인증 가드 — JWT 토큰이 없으면 /로 리디렉트 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** 플랫폼 진입점 — 비로그인 시 AuthPanel 자동 오픈, 로그인 시 대시보드로 이동 */
function PlatformLanding({ onOpenAuth }: { onOpenAuth: () => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [navigate, onOpenAuth]);

  return <InternalHome onLoginClick={onOpenAuth} />;
}

export default function App() {
  const [authStep, setAuthStep] = useState<'closed' | 'login' | 'signup'>('closed');

  const openLogin = () => setAuthStep('login');
  const goSignup = () => setAuthStep('signup');
  const goLogin = () => setAuthStep('login');
  const closeAuth = () => setAuthStep('closed');

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
            <Route path="/" element={<PlatformLanding onOpenAuth={openLogin} />} />

            <Route path="/code-insight" element={<CodeInsight />} />
            <Route path="/code-insight/instant" element={<InstantInsight />} />
            <Route path="/code-insight/project" element={<ProjectAnalysis />} />
            <Route path="/code-insight/upload" element={<ZipUpload />} />
            <Route path="/code-insight/upload/result" element={<ZipResult />} />
            <Route path="/code-insight/github" element={<GitHubConnect />} />
            <Route path="/code-insight/onboarding" element={<OnboardingPage />} />
            <Route path="/code-insight/dashboard" element={<Dashboard />} />
            <Route
              path="/code-insight/new"
              element={
                <PrivateRoute>
                  <NewProject />
                </PrivateRoute>
              }
            />
            <Route
              path="/code-insight/new/:teamProjectId/requirements"
              element={
                <PrivateRoute>
                  <NewRequirement />
                </PrivateRoute>
              }
            />

            <Route path="/auth/github-callback" element={<GithubCallback />} />
            <Route path="/auth/google-callback" element={<GoogleCallback />} />
            <Route path="/auth/kakao-callback" element={<KakaoCallback />} />
            <Route path="/auth/naver-callback" element={<NaverCallback />} />

            <Route
              path="/projects"
              element={
                <PrivateRoute>
                  <MyProjects />
                </PrivateRoute>
              }
            />
            <Route
              path="/projects/:teamProjectId"
              element={
                <PrivateRoute>
                  <ProjectDetail />
                </PrivateRoute>
              }
            />
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
