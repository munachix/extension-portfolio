import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'extensions',
  testMatch: /e2e\/[^/]*\.spec\.ts$/,
  testIgnore: /\/\._/,
  timeout: 30_000,
  workers: 2,
  reporter: [['list']],
});
