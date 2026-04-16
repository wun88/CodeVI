import api from './api';

export const metricsService = {
  analyze: async (data: any) => {
    const res = await api.post('/api/metrics/analyze', data);
    return res.data;
  },
  
  analyzeClassic: async (data: any) => {
    const res = await api.post('/api/metrics/analyze/classic', data);
    return res.data;
  },

  analyzeCK: async (data: any) => {
    const res = await api.post('/api/metrics/analyze/ck', data);
    return res.data;
  },

  analyzeOO: async (data: any) => {
    const res = await api.post('/api/metrics/analyze/oo', data);
    return res.data;
  },

  analyzeSmells: async (data: any) => {
    const res = await api.post('/api/metrics/analyze/smells', data);
    return res.data;
  }
};
