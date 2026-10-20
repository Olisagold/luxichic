import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, PORT, appEnv } from './e2e/local-supabase';

/**
 * End-to-end tests: the main journeys in a real browser against a production build of the app and the local
 * Supabase stack seeded with the demo data (`pnpm db:start`, `pnpm db:reset`, `pnpm db:seed`).
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: appEnv(),
  },
});
