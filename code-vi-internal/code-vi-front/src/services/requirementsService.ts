import api from './api';
import type {
  AnalysisFinding,
  BaselineSummaryItem,
  BuildDetail,
  BuildHistoryItem,
  CreateRequirementInput,
  DependencyItem,
  DependencyList,
  DependencyType,
  DocumentQualityCheck,
  DocumentType,
  GeneratedDocument,
  ImpactAnalysis,
  MappingSummary,
  MatchDetailItem,
  RecentActivityItem,
  Requirement,
  RequirementsSummary,
  RequirementVersion,
  ScoreSnapshot,
  UpdateRequirementInput,
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

  /** 요구사항-코드 매핑 요약(구현 점수/상태) 조회 (jej_23 Phase 7) */
  getMappingSummary: async (teamProjectId: number): Promise<MappingSummary> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/mapping-summary`);
    return res.data?.data ?? res.data;
  },

  /** 요구사항-코드 매핑 재계산("재검증" 버튼, jej_23 Phase 7) */
  recomputeMapping: async (
    teamProjectId: number,
  ): Promise<{ total: number; mapped: number }> => {
    const res = await api.post(`/api/requirements/${teamProjectId}/mapping/recompute`);
    return res.data?.data ?? res.data;
  },

  /** 요구사항 부분 수정 — status 전이/baseline 지정 포함 (jej_23 Phase 8) */
  update: async (id: number, dto: UpdateRequirementInput): Promise<Requirement> => {
    const res = await api.patch(`/api/requirements/${id}`, dto);
    return res.data?.data ?? res.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/requirements/${id}`);
  },

  /** 요구사항 변경 이력(콘텐츠 스냅샷) 조회, 최신순 (jej_23 Phase 8) */
  getVersions: async (id: number): Promise<RequirementVersion[]> => {
    const res = await api.get(`/api/requirements/${id}/versions`);
    return res.data?.data ?? res.data;
  },

  /** 의존관계 조회(나가는/들어오는) (jej_23 Phase 8) */
  getDependencies: async (id: number): Promise<DependencyList> => {
    const res = await api.get(`/api/requirements/${id}/dependencies`);
    return res.data?.data ?? res.data;
  },

  /** 의존관계 추가 — depends_on은 순환 참조 시 서버에서 거부한다 (jej_23 Phase 8) */
  addDependency: async (
    id: number,
    targetRequirementId: number,
    type: DependencyType,
  ): Promise<DependencyItem> => {
    const res = await api.post(`/api/requirements/${id}/dependencies`, {
      targetRequirementId,
      type,
    });
    return res.data?.data ?? res.data;
  },

  removeDependency: async (id: number, dependencyId: number): Promise<void> => {
    await api.delete(`/api/requirements/${id}/dependencies/${dependencyId}`);
  },

  /** 영향분석 — 연결된 코드/문서/빌드/테스트 + 의존관계 종합 조회 (jej_23 Phase 8) */
  getImpact: async (id: number): Promise<ImpactAnalysis> => {
    const res = await api.get(`/api/requirements/${id}/impact`);
    return res.data?.data ?? res.data;
  },

  /** 매칭된 코드 요소(파일/클래스/함수) top-5를 이름·경로·점수와 함께 조회 (jej_23 Phase 7 후속) */
  getMappingDetail: async (id: number): Promise<MatchDetailItem[]> => {
    const res = await api.get(`/api/requirements/${id}/mapping-detail`);
    return res.data?.data ?? res.data;
  },

  /** 문서(SRS/PRD/BRS) 목록 조회 (jej_23 Phase 9) */
  listDocuments: async (teamProjectId: number): Promise<GeneratedDocument[]> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/documents`);
    return res.data?.data ?? res.data;
  },

  /** 선택된 요구사항을 템플릿에 채워 문서를 생성한다(AI 아님) (jej_23 Phase 9) */
  generateDocument: async (
    teamProjectId: number,
    type: DocumentType,
    requirementIds: number[],
    options?: { includeTraceability?: boolean; includeNfr?: boolean },
  ): Promise<GeneratedDocument> => {
    const res = await api.post(`/api/requirements/${teamProjectId}/documents/generate`, {
      type,
      requirementIds,
      ...options,
    });
    return res.data?.data ?? res.data;
  },

  updateDocumentSection: async (
    teamProjectId: number,
    documentId: number,
    sectionId: string,
    content: string,
  ): Promise<GeneratedDocument> => {
    const res = await api.patch(`/api/requirements/${teamProjectId}/documents/${documentId}`, {
      sectionId,
      content,
    });
    return res.data?.data ?? res.data;
  },

  /** 템플릿 재생성 — 현재 요구사항 데이터로 해당 섹션만 다시 계산한다(AI 아님) (jej_23 Phase 9) */
  regenerateDocumentSection: async (
    teamProjectId: number,
    documentId: number,
    sectionId: string,
  ): Promise<GeneratedDocument> => {
    const res = await api.post(
      `/api/requirements/${teamProjectId}/documents/${documentId}/regenerate-section`,
      { sectionId },
    );
    return res.data?.data ?? res.data;
  },

  getDocumentQuality: async (
    teamProjectId: number,
    documentId: number,
  ): Promise<DocumentQualityCheck> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/documents/${documentId}/quality`);
    return res.data?.data ?? res.data;
  },

  /** 빌드 이력 — 실제 Jenkins 빌드와 재계산 시점 스코어 스냅샷을 연결해 조회 (jej_23 Phase 10) */
  getBuildHistory: async (teamProjectId: number): Promise<BuildHistoryItem[]> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/build-history`);
    return res.data?.data ?? res.data;
  },

  getBuildDetail: async (teamProjectId: number, buildNumber: number): Promise<BuildDetail> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/build-history/${buildNumber}`);
    return res.data?.data ?? res.data;
  },

  getScoreTimeline: async (
    teamProjectId: number,
    requirementId?: number,
  ): Promise<ScoreSnapshot[]> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/score-timeline`, {
      params: requirementId ? { requirementId } : undefined,
    });
    return res.data?.data ?? res.data;
  },

  /** 베이스라인별 요구사항 개수 — "설정" 탭 (jej_23 Phase 11) */
  getBaselines: async (teamProjectId: number): Promise<BaselineSummaryItem[]> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/baselines`);
    return res.data?.data ?? res.data;
  },

  /** 최근 활동 피드 — RequirementVersion 생성 시점 재사용 (jej_23 Phase 12) */
  getRecentActivity: async (teamProjectId: number): Promise<RecentActivityItem[]> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/activity`);
    return res.data?.data ?? res.data;
  },

  /** 전체 findings 조회 — AI 인사이트 카드 "전체 보기" 토글용 (jej_23 Phase 12) */
  getAllFindings: async (teamProjectId: number): Promise<AnalysisFinding[]> => {
    const res = await api.get(`/api/requirements/${teamProjectId}/analysis/findings`);
    return res.data?.data ?? res.data;
  },
};
