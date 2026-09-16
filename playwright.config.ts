import { defineConfig } from '@playwright/test';
import { E2E_DATABASE_URL } from './e2e/globalSetup';

/**
 * These tests drive the real product: a real browser, the real API, a real
 * database. There are deliberately few of them. They are the slowest and most
 * fragile tests in the project, and they earn their place by covering the wiring
 * that nothing else does.
 */
export default defineConfig({
  testDir: './e2e',
  // One at a time: the tests share one instance, and an instance has one owner.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: process.env['CI'] ? 'list' : 'html',
  globalSetup: './e2e/globalSetup.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },

  webServer: [
    {
      // serve, not dev: tsx watch restarts the API when a file changes, and a
      // restart in the middle of a test shows up as "Failed to fetch". That made
      // this suite flaky, which is worse than failing.
      command: 'npm run serve -w @testbrain/api',
      port: 4000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        SESSION_SECRET: 'end-to-end-test-secret-long-enough',
        APP_URL: 'http://localhost:3000',
        NODE_ENV: 'development',
      },
    },
    {
      command: 'npm run dev -w @testbrain/web',
      port: 3000,
      reuseExistingServer: false,
    },
  ],
});
