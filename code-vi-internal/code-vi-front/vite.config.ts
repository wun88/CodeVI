import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // dev에서도 배포와 동일하게 same-origin /api 호출이 백엔드로 프록시되도록 한다.
    // 로컬 백엔드(:13000)가 없으면 VITE_API_PROXY_TARGET=https://platform.refactory.store 로 오버라이드.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:13000',
        changeOrigin: true,
      },
    },
  },
});
