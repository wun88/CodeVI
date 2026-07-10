import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AstSnapshotSummary, DashboardProject } from '../interface/ast.interface';
import type { SnapshotOverview } from '../interface/dashboardOverview.interface';
import { astDataService } from '../services/astDataService';
import { buildSnapshotOverview } from '../utils/buildSnapshotOverview';

/** buildUrl(.../job/<jobName>/<n>/) 에서 프로젝트(잡) 이름 추출 */
function deriveProjectName(snap: AstSnapshotSummary): string {
  const m = snap.buildUrl?.match(/\/job\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : `프로젝트 #${snap.teamProjectId}`;
}

export function useDashboardData() {
  const [snapshots, setSnapshots] = useState<AstSnapshotSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [overview, setOverview] = useState<SnapshotOverview | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');

  const sortedSnapshots = useMemo(
    () =>
      [...(Array.isArray(snapshots) ? snapshots : [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [snapshots]
  );

  // 프로젝트(teamProjectId) 단위로 그룹 + 최신 활동순 정렬
  const projects = useMemo<DashboardProject[]>(() => {
    const map = new Map<number, AstSnapshotSummary[]>();
    for (const s of sortedSnapshots) {
      const arr = map.get(s.teamProjectId) ?? [];
      arr.push(s);
      map.set(s.teamProjectId, arr);
    }
    const list = Array.from(map.entries()).map(([tid, snaps]) => ({
      teamProjectId: tid,
      name: deriveProjectName(snaps[0]),
      snapshots: snaps,
      latestAt: snaps[0]?.createdAt ?? '',
    }));
    list.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
    return list;
  }, [sortedSnapshots]);

  // 프로젝트 자동 선택 (없거나 사라졌으면 최신 프로젝트)
  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId(null);
      return;
    }
    setSelectedProjectId((prev) =>
      prev != null && projects.some((p) => p.teamProjectId === prev)
        ? prev
        : projects[0].teamProjectId
    );
  }, [projects]);

  // 선택된 프로젝트의 스냅샷들만 노출
  const visibleSnapshots = useMemo(
    () => projects.find((p) => p.teamProjectId === selectedProjectId)?.snapshots ?? [],
    [projects, selectedProjectId]
  );

  // 선택 프로젝트의 최신 스냅샷 자동 선택
  useEffect(() => {
    if (visibleSnapshots.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev != null && visibleSnapshots.some((s) => s.id === prev)
        ? prev
        : visibleSnapshots[0].id
    );
  }, [visibleSnapshots]);

  // 스냅샷 목록 로드
  useEffect(() => {
    setListLoading(true);
    setListError('');
    astDataService
      .getSnapshots()
      .then(setSnapshots)
      .catch(() => setListError('스냅샷 목록을 불러오는데 실패했습니다.'))
      .finally(() => setListLoading(false));
  }, []);

  // 선택 스냅샷 상세(overview) 로드
  useEffect(() => {
    if (selectedId == null) {
      setOverview(null);
      return;
    }
    setOverview(null);
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    astDataService
      .getSnapshot(selectedId)
      .then((snap) => {
        if (!cancelled) setOverview(buildSnapshotOverview(snap));
      })
      .catch(() => {
        if (!cancelled) {
          setDetailError('선택한 스냅샷 분석 데이터를 불러오지 못했습니다.');
          setOverview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectSnapshot = useCallback((id: number) => setSelectedId(id), []);
  const selectProject = useCallback((id: number) => setSelectedProjectId(id), []);

  return {
    projects,
    selectedProjectId,
    selectProject,
    snapshots: visibleSnapshots,
    selectedId,
    selectSnapshot,
    overview,
    listLoading,
    detailLoading,
    loading: listLoading || (visibleSnapshots.length > 0 && detailLoading && !overview),
    error: listError || detailError,
  };
}
