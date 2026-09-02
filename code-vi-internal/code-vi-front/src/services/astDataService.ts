import api from './api';
import type { AstSnapshot, AstSnapshotSummary } from '../interface/ast.interface';
import type { RefactoringSuggestion } from '../interface/dashboardOverview.interface';

export const astDataService = {
  /** 전체 AST 스냅샷 목록 조회 */
  getSnapshots: async (): Promise<AstSnapshotSummary[]> => {
    const res = await api.get('/api/ast-data/relational');
    // 백엔드가 { success, statusCode, message, data } 로 래핑 → 실제 배열은 data.data
    return res.data?.data ?? [];
  },

  /** 프로젝트 하나의 스냅샷 요약 목록(관계 없이 가볍게 조회) — ProjectDetail "코드 품질" 탭용 */
  getSnapshotsForProject: async (teamProjectId: number): Promise<AstSnapshotSummary[]> => {
    const res = await api.get(`/api/ast-data/relational/project/${teamProjectId}`);
    return res.data?.data ?? [];
  },

  /** 특정 스냅샷 상세 조회 (시각화 핵심 데이터) */
  getSnapshot: async (snapshotId: number): Promise<AstSnapshot> => {
    const res = await api.get(`/api/ast-data/relational/${snapshotId}`);
    // 래핑 해제: 실제 스냅샷 객체는 data.data
    return res.data?.data ?? res.data;
  },

  /**
   * 리팩토링 인사이트에 표시 중인 후보 클래스에 대해 AI(NVIDIA) 개선 제안을 생성한다.
   * NVIDIA 응답 시간이 최대 1분 가까이 들쭉날쭉할 수 있어(백엔드 자체 타임아웃 55초),
   * 기본 axios 타임아웃(15초)보다 넉넉하게 개별 오버라이드한다.
   */
  generateAiRefactoring: async (
    teamProjectId: number,
    snapshotId: number,
    classIds: number[],
  ): Promise<RefactoringSuggestion[]> => {
    const res = await api.post(
      `/api/ast-data/relational/project/${teamProjectId}/refactoring/ai-suggest`,
      { snapshotId, classIds },
      { timeout: 65000 },
    );
    return res.data?.data ?? res.data;
  },
};
