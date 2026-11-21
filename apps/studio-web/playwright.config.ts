import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  // One retry absorbs a headless-shell crash (SEGV) without hiding product
  // failures: a real bug reproduces on the retry too.
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    locale: 'id-ID',
    trace: 'retain-on-failure',
    permissions: [],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx next start -p 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
