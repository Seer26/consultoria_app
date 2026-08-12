import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local', override: true, quiet: true });
const sourceUrl = process.env.DATABASE_URL?.trim();
if (!sourceUrl || new URL(sourceUrl).pathname.replace(/^\//, '') !== 'consultoria_local') {
  throw new Error('POSTGRES_REGRESSION_REQUIRES_LOCAL_POSTGRES');
}
const name = 'consultoria_sprint_314_regression_test';
assert(/^consultoria_[a-z0-9_]+_test$/.test(name));
const withDatabase = (database: string) => {
  const url = new URL(sourceUrl);
  url.pathname = `/${database}`;
  return url.toString();
};
const administrator = new Client({ connectionString: withDatabase('postgres') });
await administrator.connect();
const drop = async () => {
  await administrator.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [name],
  );
  await administrator.query(`DROP DATABASE IF EXISTS "${name}"`);
};

try {
  await drop();
  await administrator.query(`CREATE DATABASE "${name}"`);
  const environment = {
    ...process.env,
    DATABASE_URL: withDatabase(name),
    NODE_ENV: 'test',
    APP_ENV: 'postgres-test',
    AI_ENABLED: 'false',
  };
  for (const args of [
    ['src/tests/postgres-runtime.e2e.ts', '--smoke'],
    ['src/tests/postgres-runtime.e2e.ts'],
  ]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', ...args], {
      cwd: process.cwd(), env: environment, stdio: 'inherit', timeout: 120_000,
    });
    assert.equal(result.status, 0, `POSTGRES_REGRESSION_FAILED:${args.join(':')}`);
  }
  console.log(JSON.stringify({ ok: true, temporaryDatabase: true, postgresSmoke: true, postgresE2E: true }));
} finally {
  await drop();
  await administrator.end();
}
