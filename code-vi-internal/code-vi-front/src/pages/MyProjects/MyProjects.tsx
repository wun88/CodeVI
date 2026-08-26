import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { teamProjectService } from '../../services/teamProjectService';
import type { TeamProjectSummary } from '../../interface/teamProject.interface';
import styles from './MyProjects.module.css';

function formatUpdatedAt(project: TeamProjectSummary): string | null {
  const iso = project.updatedAt;
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d} 업데이트`;
}

function ProjectCard({
  project,
  editMode,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDelete,
  error,
}: {
  project: TeamProjectSummary;
  editMode: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
  error?: string;
}) {
  const navigate = useNavigate();
  const updatedAt = formatUpdatedAt(project);

  const goToDetail = () => {
    if (editMode) return; // 편집 중에는 카드 클릭으로 상세 이동하지 않는다 (드래그/삭제 조작 우선)
    navigate(`/dashboard/${project.id}`);
  };

  return (
    <div
      className={`${styles.card} ${editMode ? styles.editing : ''} ${isDragging ? styles.dragging : ''}`}
      onClick={goToDetail}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => e.preventDefault()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') goToDetail();
      }}
    >
      <h3 className={styles.cardTitle}>{project.teamName}</h3>
      <span className={`${styles.badge} ${styles[`badge-${project.statusVariant}`]}`}>
        <span className={styles.badgeDot} />
        {project.statusLabel}
      </span>
      {updatedAt && <p className={styles.cardMeta}>{updatedAt}</p>}

      {editMode && (
        <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
          <span
            className={styles.dragHandle}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            aria-label="드래그해서 순서 변경"
            title="드래그해서 순서 변경"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="2" r="1.4" />
              <circle cx="10" cy="2" r="1.4" />
              <circle cx="4" cy="7" r="1.4" />
              <circle cx="10" cy="7" r="1.4" />
              <circle cx="4" cy="12" r="1.4" />
              <circle cx="10" cy="12" r="1.4" />
            </svg>
          </span>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={onDelete}
            aria-label="삭제"
          >
            삭제
          </button>
        </div>
      )}
      {error && <p className={styles.cardError}>{error}</p>}
    </div>
  );
}

export default function MyProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<TeamProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const dragOriginRef = useRef<TeamProjectSummary[] | null>(null);

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

  const handleDragStart = (id: number) => {
    dragOriginRef.current = projects;
    setDraggedId(id);
  };

  // 드래그 중인 카드가 다른 카드 위를 지날 때마다 그 자리로 즉시 옮겨 보여준다(트렐로류 리스트와
  // 동일한 방식) — 실제 저장은 onDragEnd에서 한 번만 호출한다.
  const handleDragOverCard = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) return;
    setProjects((prev) => {
      const draggedIndex = prev.findIndex((p) => p.id === draggedId);
      const targetIndex = prev.findIndex((p) => p.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleDragEnd = async () => {
    const draggedIdSnapshot = draggedId;
    const origin = dragOriginRef.current;
    setDraggedId(null);
    dragOriginRef.current = null;
    if (draggedIdSnapshot === null || !origin) return;

    const unchanged = origin.map((p) => p.id).join(',') === projects.map((p) => p.id).join(',');
    if (unchanged) return;

    setRowErrors({});
    try {
      await teamProjectService.updateProjectsOrder(projects.map((p) => p.id));
    } catch {
      setProjects(origin);
      setRowErrors({ [draggedIdSnapshot]: '순서 변경에 실패했습니다.' });
    }
  };

  const handleDelete = async (project: TeamProjectSummary) => {
    if (!window.confirm(`'${project.teamName}' 프로젝트를 삭제하시겠습니까? 되돌릴 수 없습니다.`)) {
      return;
    }
    try {
      await teamProjectService.deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[project.id];
        return next;
      });
    } catch {
      setRowErrors((prev) => ({ ...prev, [project.id]: '삭제에 실패했습니다.' }));
    }
  };

  return (
    <div className={styles.page}>
      <Header variant="internal" />
      <main className={styles.content}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>내 프로젝트</h1>
          {!loading && !error && projects.length > 0 && (
            <button
              type="button"
              className={styles.editToggleBtn}
              onClick={() => setEditMode((prev) => !prev)}
            >
              {editMode ? '완료' : '편집'}
            </button>
          )}
        </div>

        {loading && <p className={styles.statusText}>불러오는 중...</p>}
        {!loading && error && <p className={styles.statusText}>{error}</p>}

        {!loading && !error && (
          <div className={styles.grid}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                editMode={editMode}
                isDragging={draggedId === project.id}
                onDragStart={() => handleDragStart(project.id)}
                onDragOver={() => handleDragOverCard(project.id)}
                onDragEnd={handleDragEnd}
                onDelete={() => handleDelete(project)}
                error={rowErrors[project.id]}
              />
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
