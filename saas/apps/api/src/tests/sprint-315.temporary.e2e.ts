import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local', override: true, quiet: true });
const sourceUrl = process.env.DATABASE_URL?.trim();
if (!sourceUrl || new URL(sourceUrl).pathname.replace(/^\//, '') !== 'consultoria_local') {
  throw new Error('SPRINT_315_TEST_REQUIRES_LOCAL_POSTGRES');
}
const database = 'consultoria_sprint_315_test';
const withDatabase = (name: string) => {
  const url = new URL(sourceUrl);
  url.pathname = `/${name}`;
  return url.toString();
};
const administrator = new Client({ connectionString: withDatabase('postgres') });
await administrator.connect();
const drop = async () => {
  await administrator.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [database],
  );
  await administrator.query(`DROP DATABASE IF EXISTS "${database}"`);
};

try {
  assert(/^consultoria_sprint_[0-9_]+_test$/.test(database));
  await drop();
  await administrator.query(`CREATE DATABASE "${database}"`);
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'src/tests/sprint-315.postgres.e2e.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: withDatabase(database),
        NODE_ENV: 'test', APP_ENV: 'postgres-test', ENABLE_DEMO_SEED: 'false',
        AI_ENABLED: 'true', AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key-never-sent',
      },
      stdio: 'inherit', timeout: 180_000,
    },
  );
  assert.equal(result.status, 0, 'SPRINT_315_POSTGRES_E2E_FAILED');
} finally {
  await drop();
  await administrator.end();
}
