/** 백엔드 TeamProjectResponseDto와 1:1 대응 (jej_20 Phase 3) */
export interface TeamProjectSummary {
  id: number;
  teamName: string;
  jenkinsJobName: string | null;
  members: string[];
  codeAnalysis: {
    buildNumber: number;
    status: string;
    bugs: number;
    vulnerabilities: number;
    securityHotspots: number;
    codeSmells: number;
    complexity: number;
    cognitiveComplexity: number;
    ncloc: number;
    createdAt: string;
  } | null;
  requirementsCount: number;
  statusVariant: 'code_analyzed' | 'requirements_only' | 'empty';
  statusLabel: string;
}

export interface TeamProjectHistory {
  project: TeamProjectSummary;
  snapshots: {
    id: number;
    buildNumber?: number;
    createdAt: string;
  }[];
}

export interface CreateTeamProjectRequest {
  teamName: string;
  jenkinsJobName: string;
}
