import api from './api';
import type { AstSnapshot, AstSnapshotSummary } from '../interface/ast.interface';

export const astDataService = {
  /** 전체 AST 스냅샷 목록 조회 */
  getSnapshots: async (): Promise<AstSnapshotSummary[]> => {
    const res = await api.get('/api/ast-data/relational');
    return res.data;
  },

  /** 특정 스냅샷 상세 조회 (시각화 핵심 데이터) */
  getSnapshot: async (snapshotId: number): Promise<AstSnapshot> => {
    const res = await api.get(`/api/ast-data/relational/${snapshotId}`);
    return res.data;
  },
};
