import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.WEB_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    // Setup de autenticação: roda primeiro, loga uma vez e salva o estado
    // (ver e2e/auth.setup.ts). Evita os 4 logins via UI por rodada que
    // batiam no throttler da API.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm start',
    url: process.env.WEB_URL || 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
