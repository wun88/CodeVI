import React, { useState } from 'react';
import { onboardingService } from '../../services/onboardingService';
import { FaGithub, FaKey, FaRocket, FaSpinner } from 'react-icons/fa';
import './ProjectOnboardingPanel.css';

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
            <div className="pat-notice">
              🔑 PAT 발급 시 <strong>Contents → Read and Write</strong> 권한을 체크해주세요.
            </div>
          </div>
          <button type="submit" disabled={status === 'loading'} className={status}>
            {status === 'loading' ? <FaSpinner className="spin" /> : '연동 시작'}
          </button>
        </form>
        {message && <div className={`msg ${status}`}>{message}</div>}
      </div>
    </div>
  );
};

export default ProjectOnboardingPanel;
