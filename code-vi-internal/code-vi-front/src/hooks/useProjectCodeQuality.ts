import { useEffect, useState } from 'react';
import type { AstSnapshotSummary } from '../interface/ast.interface';
import type { SnapshotOverview } from '../interface/dashboardOverview.interface';
import { astDataService } from '../services/astDataService';
import { buildSnapshotOverview } from '../utils/buildSnapshotOverview';

/**
 * 구 /dashboard 전역 대시보드의 프로젝트 스코프 버전(현 워크스페이스 코드 품질 뷰) — ProjectDetail의
 * "코드 품질" 탭용 (jej_23 Phase 12 후속). 전체 스냅샷을 불러온 뒤 클라이언트에서 프로젝트별로
 * 묶는 대신, teamProjectId로 이미 필터링된 가벼운 목록 API를 쓴다.
 */
export function useProjectCodeQuality(teamProjectId: number) {
  const [snapshots, setSnapshots] = useState<AstSnapshotSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [overview, setOverview] = useState<SnapshotOverview | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListLoading(true);
    setListError('');
    astDataService
      .getSnapshotsForProject(teamProjectId)
      .then((data) => {
        if (cancelled) return;
        setSnapshots(data);
        setSelectedId(data.length > 0 ? data[0].id : null);
      })
      .catch(() => {
        if (!cancelled) setListError('스냅샷 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamProjectId]);

  useEffect(() => {
    if (selectedId == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverview(null);
      return;
    }
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

  return {
    snapshots,
    selectedId,
    selectSnapshot: setSelectedId,
    overview,
    listLoading,
    detailLoading,
    error: listError || detailError,
  };
}
