import api from './api';
import type { TeamProjectSummary } from '../interface/teamProject.interface';

export const teamProjectService = {
  createJenkinsNotification: async (data: Record<string, unknown>) => {
    const res = await api.post('/api/team-projects', data);
    return res.data;
  },

  getBuildHistory: async () => {
    const res = await api.get('/api/team-projects/history');
    return res.data;
  },

  /** "내 프로젝트" 목록 — 코드 분석 프로젝트/요구사항 전용 프로젝트를 함께 반환 (jej_20 Phase 3) */
  getMyProjects: async (): Promise<TeamProjectSummary[]> => {
    const res = await api.get('/api/team-projects/mine');
    return res.data?.data ?? res.data;
  },

  /** "새 프로젝트 시작하기" — Jenkins/GitHub 연동 없이 프로젝트만 먼저 생성 (jej_20 Phase 4) */
  createRequirementsOnlyProject: async (
    teamName: string,
  ): Promise<{ id: number; teamName: string }> => {
    const res = await api.post('/api/team-projects/requirements-only', { teamName });
    return res.data?.data ?? res.data;
  },

  /** 프로젝트 상세 — 본인이 속한 프로젝트가 아니면 403 (jej_20 Phase 5) */
  getProjectDetail: async (teamProjectId: number): Promise<TeamProjectSummary> => {
    const res = await api.get(`/api/team-projects/${teamProjectId}`);
    return res.data?.data ?? res.data;
  },

  /** "내 프로젝트" 카드 순서 저장 — 화면에 보이는 카드 전체의 id를 원하는 순서대로 전달 (jej_22 Phase 4) */
  updateProjectsOrder: async (orderedIds: number[]): Promise<void> => {
    await api.patch('/api/team-projects/order', { orderedIds });
  },

  /** 프로젝트 삭제 — 본인이 속한 프로젝트가 아니면 403 (jej_22 Phase 4) */
  deleteProject: async (teamProjectId: number): Promise<void> => {
    await api.delete(`/api/team-projects/${teamProjectId}`);
  },
};
