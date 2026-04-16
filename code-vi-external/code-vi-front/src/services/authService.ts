import api from './api';
import type { SignupRequest, SigninRequest, AuthResponse } from '../interface/auth.interface';

export const authService = {
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/signup', data);
    return res.data;
  },

  signin: async (data: SigninRequest): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/signin', data);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/users/logout');
    localStorage.removeItem('accessToken');
  },

  redirectToGoogleSignIn: (): void => {
    window.location.href = 'http://localhost:13000/api/auth/google/signin';
  },

  redirectToGithubSignIn: (): void => {
    window.location.href = 'http://localhost:13000/api/auth/github/signin';
  },

  redirectToKakaoSignIn: (): void => {
    window.location.href = 'http://localhost:13000/api/auth/kakao/signin';
  },
};
