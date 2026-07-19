import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import Database from 'better-sqlite3';

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'consultoria-staging-startup-'));
const databasePath = path.join(root, 'data-volume', 'consultoria.sqlite');
const backupDirectory = path.join(root, 'backup-volume');
const port = await freePort();
const output: string[] = [];

const child = spawn(process.execPath, ['--import', 'tsx', 'dist/server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    APP_ENV: 'staging',
    PORT: String(port),
    DATABASE_URL: '',
    DATABASE_PATH: databasePath,
    SQLITE_BACKUP_DIR: backupDirectory,
    SQLITE_BACKUP_RETENTION: '10',
    SQLITE_VOLUME_ACK: 'single-instance-persistent-volume',
    API_REPLICA_COUNT: '1',
    ENABLE_DEMO_SEED: 'false',
    JWT_SECRET: 'K9-Strong-Staging-Key-0123456789-ABCDEF',
    JWT_EXPIRES_IN: '7d',
    CORS_ORIGINS: 'https://app-staging.example.invalid',
    APP_PUBLIC_URL: 'https://app-staging.example.invalid',
    API_PUBLIC_URL: 'https://api-staging.example.invalid',
    TRUST_PROXY_HOPS: '1',
    EMAIL_PROVIDER: 'http',
    EMAIL_ALLOW_TEST_PROVIDER: 'false',
    EMAIL_FROM: 'no-reply@example.invalid',
    EMAIL_API_URL: 'https://email-staging.example.invalid/send',
    EMAIL_API_KEY: 'fake-key-for-startup-test-only',
    OPENAI_API_KEY: 'fake-key-for-readiness-only',
    REQUIRE_AI_IN_READINESS: 'true',
    ENABLE_INTERNAL_METRICS: 'true',
    REQUIRE_LEGAL_ACCEPTANCE: 'true',
    TERMS_VERSION: 'beta-test-v1',
    PRIVACY_VERSION: 'beta-test-v1',
    ENABLE_EXTERNAL_ALERTS: 'false',
    LOG_FORMAT: 'json',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', (chunk) => output.push(String(chunk)));
child.stderr.on('data', (chunk) => output.push(String(chunk)));

async function waitForHealth(): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`Staging process exited early: ${output.join('')}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // Processo ainda inicializando.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Staging health timeout: ${output.join('')}`);
}

try {
  await waitForHealth();
  const health = await fetch(`http://127.0.0.1:${port}/health`);
  const healthBody = await health.json() as { environment: string };
  assert.equal(health.status, 200);
  assert.equal(healthBody.environment, 'staging');

  const ready = await fetch(`http://127.0.0.1:${port}/ready`);
  const readyBody = await ready.json() as { status: string };
  assert.equal(ready.status, 200);
  assert.equal(readyBody.status, 'ready');

  child.kill('SIGTERM');
  const exitResult = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) =>
    child.once('exit', (code, signal) => resolve({ code, signal })));
  if (process.platform === 'win32') {
    assert.equal(child.killed, true);
  } else {
    assert.equal(exitResult.code, 0, output.join(''));
    assert.match(output.join(''), /graceful shutdown completed/);
  }

  const database = new Database(databasePath, { readonly: true });
  const demoUsers = database.prepare(`
    SELECT COUNT(*) AS total FROM users
    WHERE email IN ('admin@teste.com', 'owner@teste.com', 'employee@teste.com')
  `).get() as { total: number };
  assert.equal(demoUsers.total, 0);
  database.close();

  console.log(JSON.stringify({
    ok: true,
    stagingProcessStarted: true,
    healthChecked: true,
    readinessReadyChecked: true,
    demoSeedDisabledChecked: true,
    gracefulShutdownChecked: process.platform !== 'win32',
    gracefulShutdownHandlersValidatedOnWindows: process.platform === 'win32',
  }));
} finally {
  if (!child.killed && child.exitCode == null) child.kill('SIGKILL');
  fs.rmSync(root, { recursive: true, force: true });
}
