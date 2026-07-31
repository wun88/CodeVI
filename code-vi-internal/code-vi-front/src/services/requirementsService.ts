import api from './api';
import type {
  AnalysisFinding,
  CreateRequirementInput,
  Requirement,
  RequirementsSummary,
} from '../interface/requirement.interface';

export interface BulkCreateResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

export const requirementsService = {
  create: async (input: CreateRequirementInput): Promise<Requirement> => {
    const res = await api.post('/api/requirements', input);
    return res.data?.data ?? res.data;
  },

  /** CSV 가져오기/AI 생성 결과 일괄 등록 — 트랜잭션 1회, 전부 성공하거나 전부 롤백 (jej_22 PR #61 리뷰 #6) */
  createBulk: async (
    teamProjectId: number,
    items: Omit<CreateRequirementInput, 'teamProjectId'>[],
  ): Promise<BulkCreateResult> => {
    const res = await api.post('/api/requirements/bulk', { teamProjectId, items });
    return res.data?.data ?? res.data;
  },

  listByTeamProject: async (teamProjectId: number): Promise<Requirement[]> => {
    const res = await api.get('/api/requirements', { params: { teamProjectId } });
    return res.data?.data ?? res.data;
  },

  /** 요구사항 대시보드 집계 — 개수/우선순위 분포/마감 알림/AI 분석 요약 (jej_20 Phase 6) */
  getSummary: async (teamProjectId: number): Promise<RequirementsSummary> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/summary`);
    return res.data?.data ?? res.data;
  },

  /** 중복/충돌/누락 후보 재계산 ("AI 분석 실행" 버튼, jej_20 Phase 6) */
  recomputeAnalysis: async (teamProjectId: number): Promise<AnalysisFinding[]> => {
    const res = await api.post(`/api/requirements/${teamProjectId}/analysis/recompute`);
    return res.data?.data ?? res.data;
  },
};
