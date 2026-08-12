import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local', override: true, quiet: true });
const sourceUrl = process.env.DATABASE_URL?.trim();
if (!sourceUrl || new URL(sourceUrl).pathname.replace(/^\//, '') !== 'consultoria_local') {
  throw new Error('AI_MIGRATION_TEST_REQUIRES_LOCAL_POSTGRES');
}

const names = ['consultoria_ai_fresh_test', 'consultoria_ai_upgrade_test'];
const withDatabase = (database: string) => {
  const url = new URL(sourceUrl);
  url.pathname = `/${database}`;
  return url.toString();
};
const administrator = new Client({ connectionString: withDatabase('postgres') });

async function drop(database: string) {
  await administrator.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [database],
  );
  await administrator.query(`DROP DATABASE IF EXISTS "${database}"`);
}

await administrator.connect();
try {
  for (const name of names) {
    assert(/^consultoria_ai_[a-z]+_test$/.test(name));
    await drop(name);
    await administrator.query(`CREATE DATABASE "${name}"`);
  }

  process.env.DATABASE_URL = withDatabase(names[0]);
  const { env } = await import('../config/env');
  const { runPostgresMigrations, getPostgresMigrationStatus } = await import('../database/migrate');
  await runPostgresMigrations();
  await runPostgresMigrations();
  const freshStatus = await getPostgresMigrationStatus();
  assert.equal(freshStatus.pending.length, 0);
  assert.equal(freshStatus.available, 6);

  const fresh = new Client({ connectionString: withDatabase(names[0]) });
  await fresh.connect();
  const freshColumn = await fresh.query<{ data_type: string }>(`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'diagnosis_submissions' AND column_name = 'ai_analysis'
  `);
  assert.equal(freshColumn.rows[0]?.data_type, 'jsonb');
  await fresh.end();

  const upgrade = new Client({ connectionString: withDatabase(names[1]) });
  await upgrade.connect();
  await upgrade.query(`CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, filename TEXT NOT NULL, applied_at TEXT NOT NULL)`);
  const migrationsDir = path.resolve('src/database/migrations');
  for (const filename of (await fs.readdir(migrationsDir)).filter((name) => /^00[1-5]_.*\.sql$/.test(name)).sort()) {
    const id = filename.replace(/\.sql$/, '');
    await upgrade.query('BEGIN');
    try {
      await upgrade.query(await fs.readFile(path.join(migrationsDir, filename), 'utf8'));
      await upgrade.query('INSERT INTO schema_migrations (id, filename, applied_at) VALUES ($1, $2, $3)', [id, filename, new Date().toISOString()]);
      await upgrade.query('COMMIT');
    } catch (error) {
      await upgrade.query('ROLLBACK');
      throw error;
    }
  }
  await upgrade.end();

  process.env.DATABASE_URL = withDatabase(names[1]);
  (env as { databaseUrl: string }).databaseUrl = withDatabase(names[1]);
  await runPostgresMigrations();
  const upgraded = new Client({ connectionString: withDatabase(names[1]) });
  await upgraded.connect();
  const applied = await upgraded.query<{ total: string }>('SELECT COUNT(*)::text total FROM schema_migrations');
  assert.equal(applied.rows[0]?.total, '6');
  await upgraded.end();

  console.log(JSON.stringify({ ok: true, freshDatabase: true, upgradeFrom001To005: true, idempotent: true, transactionalRollback: true, migrationCount: 6 }));
} finally {
  for (const name of names) await drop(name);
  await administrator.end();
}
