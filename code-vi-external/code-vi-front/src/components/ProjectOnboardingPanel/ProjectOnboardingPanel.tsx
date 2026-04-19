import React, { useState } from 'react';
import { onboardingService } from '../../services/onboardingService';
import { FaGithub, FaKey, FaRocket, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const ProjectOnboardingPanel: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [pat, setPat] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('분석 파이프라인 구축 중...');
    try {
      const result = await onboardingService.onboardProject(repoUrl, pat);
      setStatus('success');
      setMessage(`성공! Jenkins 작업(${result.jobName})이 생성되었습니다.`);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  return (
    <div className="onboard-wrapper">
      <div className="onboard-card">
        <h2><FaRocket /> 프로젝트 분석 시작</h2>
        <form onSubmit={handleOnboard}>
          <div className="input-field">
            <label><FaGithub /> Repo URL</label>
            <input type="text" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} required />
          </div>
          <div className="input-field">
            <label><FaKey /> GitHub PAT</label>
            <input type="password" value={pat} onChange={e => setPat(e.target.value)} required />
          </div>
          <button type="submit" disabled={status === 'loading'} className={status}>
            {status === 'loading' ? <FaSpinner className="spin" /> : '연동 시작'}
          </button>
        </form>
        {message && <div className={`msg ${status}`}>{message}</div>}
      </div>
      <style>{`
        .onboard-wrapper { display: flex; justify-content: center; padding: 40px; }
        .onboard-card { background: #1a1a1a; padding: 30px; border-radius: 15px; color: white; width: 400px; border: 1px solid #333; }
        .input-field { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
        input { background: #000; border: 1px solid #444; padding: 10px; color: white; border-radius: 5px; }
        button { width: 100%; padding: 12px; background: linear-gradient(to right, #4facfe, #00f2fe); border: none; border-radius: 5px; color: white; font-weight: bold; cursor: pointer; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .msg { margin-top: 20px; padding: 10px; border-radius: 5px; font-size: 0.9rem; }
        .msg.success { background: rgba(0, 255, 0, 0.1); color: #00ff00; }
        .msg.error { background: rgba(255, 0, 0, 0.1); color: #ff0000; }
      `}</style>
    </div>
  );
};

export default ProjectOnboardingPanel;
