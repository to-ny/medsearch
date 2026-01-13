import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || '3000';
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    // In CI, build is done separately, so just start the server
    command: process.env.CI ? 'bun start' : 'bun run build && bun start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for server startup
  },
});
