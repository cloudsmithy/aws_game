import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 30_000,
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:8878',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tools/serve.mjs',
    url: 'http://127.0.0.1:8878',
    reuseExistingServer: false
  }
});
