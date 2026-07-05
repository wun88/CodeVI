import axios from 'axios';

// 같은 origin으로 호출 → 프론트 nginx가 /api 를 codevi-backend 컨테이너로 프록시.
// 백엔드 IP/포트가 브라우저에 노출되지 않고, IP·도메인 어디로 접속하든 API가 붙는다.
const BASE_URL = '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 — JWT 토큰 자동 주입
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 — 401 시 로그인 리디렉트
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
