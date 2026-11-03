import { defineConfig, devices } from '@playwright/test';

// 테스트 전에 서버(8080)와 화면(5173)을 띄운다. 이미 켜져 있으면 그걸 쓴다.
// MySQL은 미리 켜 두세요: (프로젝트 루트에서) docker compose up -d
const gradle = process.platform === 'win32' ? 'gradlew.bat bootRun' : './gradlew bootRun';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: gradle,
      cwd: '../backend',
      url: 'http://localhost:8080/api/players',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      cwd: '../frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
