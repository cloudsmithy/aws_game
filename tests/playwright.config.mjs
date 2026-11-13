import { defineConfig } from '@playwright/test';

const baseURL = `http://127.0.0.1:${process.env.AWS_GAME_TEST_PORT || 8878}`;

export default defineConfig({
  testDir: '.',
  workers: 1,
  timeout: 30_000,
  use: {
    browserName: 'chromium',
    baseURL,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node serve.mjs',
    url: baseURL,
    reuseExistingServer: false
  }
});
