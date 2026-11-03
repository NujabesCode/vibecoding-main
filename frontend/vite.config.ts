import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버: /api 와 /ws 는 스프링 서버로 넘긴다 (기본 8080, E2E 때는 API_TARGET으로 바꾼다).
// host: true 라서 같은 와이파이의 학생들이 강사 노트북 IP로 접속할 수 있다.
const api = process.env.API_TARGET ?? 'http://localhost:8080';

// 메타버스 탭을 닫으면 WebSocket이 툭 끊기는 건 정상이다. 그때 나오는 빨간 로그만 숨긴다.
const logger = createLogger();
const logError = logger.error;
logger.error = (msg, options) => {
  if (msg.includes('ws proxy') && /ECONNRESET|EPIPE/.test(msg)) return;
  logError(msg, options);
};

export default defineConfig({
  plugins: [react()],
  customLogger: logger,
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': api,
      '/ws': { target: api.replace(/^http/, 'ws'), ws: true },
    },
  },
});
