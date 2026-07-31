import api from './api';

export interface GithubRepositorySummary {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
  htmlUrl: string;
  stargazersCount: number;
}

export interface GithubConnectionStatus {
  connected: boolean;
  githubUsername: string | null;
}

export interface RegisteredProject {
  teamProjectId: number;
  jenkinsJobName: string;
  githubRepoFullName: string;
}

export const githubConnectService = {
  getConnectionStatus: async (): Promise<GithubConnectionStatus> => {
    const res = await api.get('/api/github/connection');
    return res.data?.data ?? res.data;
  },

  // window.location.href 풀 리다이렉트는 Authorization 헤더를 실어 보낼 수 없어
  // 로그인 JWT를 쿼리스트링으로 전달한다 (authService의 github-callback과 동일한 관례).
  // teamProjectId가 있으면 "기존 프로젝트에 코드 연결"(jej_20 Phase 5) — 콜백 후 이 프로젝트로 되돌아온다.
  redirectToConnect: (teamProjectId?: number): void => {
    const token = localStorage.getItem('accessToken') ?? '';
    const query = new URLSearchParams({ token });
    if (teamProjectId) query.set('teamProjectId', String(teamProjectId));
    window.location.href = `/api/github/connect?${query.toString()}`;
  },

  listRepositories: async (): Promise<GithubRepositorySummary[]> => {
    const res = await api.get('/api/github/repositories');
    return res.data?.data ?? res.data;
  },

  registerProject: async (
    owner: string,
    repo: string,
    teamProjectId?: number,
  ): Promise<RegisteredProject> => {
    const res = await api.post('/api/github/projects', { owner, repo, teamProjectId });
    return res.data?.data ?? res.data;
  },

  disconnect: async (): Promise<void> => {
    await api.delete('/api/github/connection');
  },
};
