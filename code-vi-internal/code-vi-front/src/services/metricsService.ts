// DEAD CODE (2026-07-11): 어떤 컴포넌트/훅에서도 import되지 않음.
// 게다가 대상 백엔드 /api/metrics/* 8종은 ValidationPipe(whitelist)+데코레이터 없는
// AnalyzeAstRequestDto 때문에 body가 통째로 strip되어 현재 전부 500 반환 — 연결해도 동작 불가.
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
