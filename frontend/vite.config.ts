import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버: /api 와 /ws 는 스프링 서버(8080)로 넘긴다.
// host: true 라서 같은 와이파이의 학생들이 강사 노트북 IP로 접속할 수 있다.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
});
