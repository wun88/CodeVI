import api from './api';
import type { SignupRequest, SigninRequest, AuthResponse } from '../interface/auth.interface';

export const authService = {
  // DEAD CODE (2026-07-11): 정책상 로컬 회원가입 미사용(인증은 GitHub·Google OAuth만 사용).
  // 호출자도 없고, SignupRequest(teamName/jenkinsJobName)가 백엔드 CreateUserDto와 불일치.
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/signup', data);
    return res.data;
  },

  // DEAD CODE (2026-07-11): 정책상 로컬 로그인 미사용(인증은 GitHub·Google OAuth만 사용).
  // 호출자도 없고, SigninRequest(teamName)가 백엔드 SignInRequestDto(email/password)와 불일치.
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

  // DEAD CODE (2026-07-11): 정책상 GitHub·Google 로그인만 사용 — Kakao 리다이렉트 미사용(버튼 정리 시 제거).
  redirectToKakaoSignIn: (): void => {
    window.location.href = '/api/auth/kakao/signin';
  },

  // DEAD CODE (2026-07-11): 정책상 GitHub·Google 로그인만 사용 — Naver 리다이렉트 미사용(버튼 정리 시 제거).
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
