export interface TeamProject {
  id: number;
  teamName: string;
  jenkinsJobName: string;
  createdAt?: string;
}

export interface TeamProjectHistory {
  project: TeamProject;
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
