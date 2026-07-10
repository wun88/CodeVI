import api from './api';
import type { AstSnapshot, AstSnapshotSummary } from '../interface/ast.interface';

export const astDataService = {
  /** 전체 AST 스냅샷 목록 조회 */
  getSnapshots: async (): Promise<AstSnapshotSummary[]> => {
    const res = await api.get('/api/ast-data/relational');
    // 백엔드가 { success, statusCode, message, data } 로 래핑 → 실제 배열은 data.data
    return res.data?.data ?? [];
  },

  /** 특정 스냅샷 상세 조회 (시각화 핵심 데이터) */
  getSnapshot: async (snapshotId: number): Promise<AstSnapshot> => {
    const res = await api.get(`/api/ast-data/relational/${snapshotId}`);
    // 래핑 해제: 실제 스냅샷 객체는 data.data
    return res.data?.data ?? res.data;
  },
};
