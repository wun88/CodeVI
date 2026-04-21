import { useState, useEffect } from 'react';
import { astDataService } from '../services/astDataService';
import type { AstSnapshot } from '../interface/ast.interface';

/**
 * 스냅샷 ID로 원시 AstSnapshot을 가져오는 훅.
 * 변환(astSnapshotToFlow)은 AstFlowCanvas 내부에서 수행한다 (원본 설계 유지).
 */
export const useAstSnapshotData = (snapshotId: number | null) => {
  const [snapshot, setSnapshot] = useState<AstSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!snapshotId) {
      setSnapshot(null);
      return;
    }

    let isMounted = true;

    const fetchSnapshot = async () => {
      try {
        setLoading(true);
        const result = await astDataService.getSnapshot(snapshotId);

        if (isMounted) {
          setSnapshot(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSnapshot();

    return () => {
      isMounted = false;
    };
  }, [snapshotId]);

  return { snapshot, loading, error };
};
