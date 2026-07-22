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
  redirectToConnect: (): void => {
    const token = localStorage.getItem('accessToken') ?? '';
    window.location.href = `/api/github/connect?token=${encodeURIComponent(token)}`;
  },

  listRepositories: async (): Promise<GithubRepositorySummary[]> => {
    const res = await api.get('/api/github/repositories');
    return res.data?.data ?? res.data;
  },

  registerProject: async (owner: string, repo: string): Promise<RegisteredProject> => {
    const res = await api.post('/api/github/projects', { owner, repo });
    return res.data?.data ?? res.data;
  },

  disconnect: async (): Promise<void> => {
    await api.delete('/api/github/connection');
  },
};
