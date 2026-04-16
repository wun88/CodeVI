export interface SignupRequest {
  teamName: string;
  jenkinsJobName: string;
  password: string;
}

export interface SigninRequest {
  teamName: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    teamName: string;
  };
}

export interface User {
  id: number;
  teamName: string;
  jenkinsJobName?: string;
}
