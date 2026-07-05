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
    window.location.href = '/api/auth/google/signin';
  },

  redirectToGithubSignIn: (): void => {
    window.location.href = '/api/auth/github/signin';
  },

  redirectToKakaoSignIn: (): void => {
    window.location.href = '/api/auth/kakao/signin';
  },

  redirectToNaverSignIn: (): void => {
    window.location.href = '/api/auth/naver/signin';
  },

  getRsaPublicKey: async (): Promise<string> => {
    const res = await api.get('/api/auth/rsa-public-key');
    return res.data.data;
  },

  encryptPat: async (pat: string, pemKey: string): Promise<string> => {
    const b64 = pemKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');
    const byteString = window.atob(b64);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);

    const cryptoKey = await window.crypto.subtle.importKey(
      'spki', byteArray.buffer, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
    );

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' }, cryptoKey, new TextEncoder().encode(pat)
    );

    return window.btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  },
};
