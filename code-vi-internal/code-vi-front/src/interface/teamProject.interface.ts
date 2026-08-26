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
  /** 프로젝트 자체의 마지막 수정일(ISO) — 순서 변경으로는 갱신되지 않는다 (jej_22 Phase 3) */
  updatedAt: string;
  /** 실제 GitHub/Jenkins/Sonar 연동 상태 — null이면 미연동 ("설정" 탭, jej_23 Phase 11) */
  githubRepoFullName: string | null;
  githubDefaultBranch: string | null;
  sonarProjectKey: string | null;
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
