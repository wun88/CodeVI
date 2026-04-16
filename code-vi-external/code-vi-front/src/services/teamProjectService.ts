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
