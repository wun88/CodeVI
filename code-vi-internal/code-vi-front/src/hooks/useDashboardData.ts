import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AstSnapshotSummary } from '../interface/ast.interface';
import type { SnapshotOverview } from '../interface/dashboardOverview.interface';
import { astDataService } from '../services/astDataService';
import { buildSnapshotOverview } from '../utils/buildSnapshotOverview';

export function useDashboardData() {
  const [snapshots, setSnapshots] = useState<AstSnapshotSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [overview, setOverview] = useState<SnapshotOverview | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');

  const sortedSnapshots = useMemo(
    () =>
      [...snapshots].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [snapshots]
  );

  useEffect(() => {
    setListLoading(true);
    setListError('');
    astDataService
      .getSnapshots()
      .then(setSnapshots)
      .catch(() => setListError('스냅샷 목록을 불러오는데 실패했습니다.'))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    if (sortedSnapshots.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev != null && sortedSnapshots.some((s) => s.id === prev)) return prev;
      return sortedSnapshots[0].id;
    });
  }, [sortedSnapshots]);

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

  const selectSnapshot = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  return {
    snapshots: sortedSnapshots,
    selectedId,
    selectSnapshot,
    overview,
    listLoading,
    detailLoading,
    loading: listLoading || (sortedSnapshots.length > 0 && detailLoading && !overview),
    error: listError || detailError,
  };
}
