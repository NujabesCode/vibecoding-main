import { defineConfig, devices } from '@playwright/test';

// E2E는 수업용 서버와 따로 돈다: 서버 8081 + 화면 5174 + DB campus_e2e
// (그래서 개발 서버를 켜 둔 채로 테스트해도 서로 안 섞인다)
// MySQL은 미리 켜 두세요: (프로젝트 루트에서) docker compose up -d
const gradle = process.platform === 'win32' ? 'gradlew.bat bootRun' : './gradlew bootRun';
const E2E_DB = 'jdbc:mysql://localhost:3306/campus_e2e?createDatabaseIfNotExist=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: gradle,
      cwd: '../backend',
      url: 'http://localhost:8081/api/players',
      env: { PORT: '8081', DB_URL: process.env.E2E_DB_URL ?? E2E_DB },
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      cwd: '../frontend',
      url: 'http://localhost:5174',
      env: { API_TARGET: 'http://localhost:8081' },
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
