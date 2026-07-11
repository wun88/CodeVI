// DEAD CODE (2026-07-11): 어떤 컴포넌트/훅에서도 import되지 않음.
// (백엔드 /api/team-projects, /api/team-projects/history 자체는 정상 동작 확인됨)
import api from './api';

export const teamProjectService = {
  createJenkinsNotification: async (data: any) => {
    const res = await api.post('/api/team-projects', data);
    return res.data;
  },

  getBuildHistory: async () => {
    const res = await api.get('/api/team-projects/history');
    return res.data;
  }
};
