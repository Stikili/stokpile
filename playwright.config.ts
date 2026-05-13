import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  // The Vite 7 dev server is flaky under multi-worker hammering — a single
  // worker is reliable and still finishes the full suite in under a minute.
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 30000,
    reuseExistingServer: true,
  },
});
