import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { teamProjectService } from '../../services/teamProjectService';
import type { TeamProjectSummary } from '../../interface/teamProject.interface';
import styles from './MyProjects.module.css';

function formatUpdatedAt(project: TeamProjectSummary): string | null {
  const iso = project.codeAnalysis?.createdAt;
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d} 업데이트`;
}

function ProjectCard({ project }: { project: TeamProjectSummary }) {
  const navigate = useNavigate();
  const updatedAt = formatUpdatedAt(project);

  return (
    <div
      className={styles.card}
      onClick={() => navigate(`/projects/${project.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/projects/${project.id}`);
      }}
    >
      <h3 className={styles.cardTitle}>{project.teamName}</h3>
      <span className={`${styles.badge} ${styles[`badge-${project.statusVariant}`]}`}>
        <span className={styles.badgeDot} />
        {project.statusLabel}
      </span>
      {updatedAt && <p className={styles.cardMeta}>{updatedAt}</p>}
    </div>
  );
}

export default function MyProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<TeamProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    teamProjectService
      .getMyProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch(() => {
        if (!cancelled) setError('프로젝트 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.page}>
      <Header variant="internal" />
      <main className={styles.content}>
        <h1 className={styles.title}>내 프로젝트</h1>

        {loading && <p className={styles.statusText}>불러오는 중...</p>}
        {!loading && error && <p className={styles.statusText}>{error}</p>}

        {!loading && !error && (
          <div className={styles.grid}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}

            <button
              type="button"
              className={styles.newCard}
              onClick={() => navigate('/code-insight')}
            >
              <span className={styles.newCardPlus}>+</span>
              <span>새 프로젝트</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
