import { defineConfig } from '@playwright/test';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.E2E_DATABASE_PATH ??= join(mkdtempSync(join(tmpdir(), 'consultoria-e2e-')), 'test.sqlite');
export default defineConfig({
  testDir: './apps/web/e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) } },
  webServer: [
    { command: 'npm run dev:api', env: { PORT: '3433', DATABASE_PATH: process.env.E2E_DATABASE_PATH }, url: 'http://127.0.0.1:3433/health', reuseExistingServer: false },
    { command: 'npm --workspace @consultoria/web run dev -- --host 127.0.0.1 --port 5174 --strictPort', env: { API_TARGET: 'http://127.0.0.1:3433' }, url: 'http://127.0.0.1:5174', reuseExistingServer: false },
  ],
});
