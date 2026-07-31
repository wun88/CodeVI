import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import { teamProjectService } from '../../../services/teamProjectService';
import '../CodeInsight.css';
import styles from './NewProject.module.css';

export default function NewProject() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('프로젝트 이름을 입력하세요.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const project = await teamProjectService.createRequirementsOnlyProject(teamName.trim());
      navigate(`/code-insight/new/${project.id}/requirements`, {
        state: { teamName: project.teamName },
      });
    } catch {
      setError('프로젝트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      setSubmitting(false);
    }
  };

  return (
    <div className="code-insight-page">
      <Header variant="internal" />
      <main className="code-insight-content project-shell">
        <button className="back-btn" onClick={() => navigate('/code-insight')} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>

        <div className="code-insight-header header-left">
          <h1>새 프로젝트 시작하기</h1>
          <p>코드 없이 요구사항부터 — 프로젝트 이름을 정하고 요구사항 입력으로 이동합니다.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="teamName">
            프로젝트 이름
          </label>
          <input
            id="teamName"
            className={styles.input}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="예: 쇼핑몰 리뉴얼 기획"
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? '생성 중...' : '다음: 요구사항 입력'}
          </button>
        </form>
      </main>
    </div>
  );
}
