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
const migrationsDir = path.resolve('src/database/migrations');

async function drop(database: string) {
  await administrator.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [database],
  );
  await administrator.query(`DROP DATABASE IF EXISTS "${database}"`);
}

async function apply(client: Client, maximum = 7) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY, filename TEXT NOT NULL, applied_at TEXT NOT NULL
  )`);
  const applied = new Set((await client.query<{ id: string }>('SELECT id FROM schema_migrations')).rows.map((row) => row.id));
  const files = (await fs.readdir(migrationsDir)).filter((name) => /^00[1-7]_.*\.sql$/.test(name)).sort().slice(0, maximum);
  for (const filename of files) {
    const id = filename.replace(/\.sql$/, '');
    if (applied.has(id)) continue;
    await client.query('BEGIN');
    try {
      await client.query(await fs.readFile(path.join(migrationsDir, filename), 'utf8'));
      await client.query('INSERT INTO schema_migrations (id, filename, applied_at) VALUES ($1, $2, $3)', [id, filename, new Date().toISOString()]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
}

await administrator.connect();
try {
  for (const name of names) {
    assert(/^consultoria_ai_[a-z]+_test$/.test(name));
    await drop(name);
    await administrator.query(`CREATE DATABASE "${name}"`);
  }

  const fresh = new Client({ connectionString: withDatabase(names[0]) });
  await fresh.connect();
  try {
    await apply(fresh);
    await apply(fresh);
    const applied = await fresh.query<{ total: string }>('SELECT COUNT(*)::text total FROM schema_migrations');
    assert.equal(applied.rows[0]?.total, '7');
    const profileColumns = await fresh.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name IN ('users', 'diagnosis_submissions')
        AND column_name IN ('department', 'job_function', 'respondent_department', 'respondent_job_function')
    `);
    assert.equal(profileColumns.rows.length, 5);
  } finally {
    await fresh.end();
  }

  const upgrade = new Client({ connectionString: withDatabase(names[1]) });
  await upgrade.connect();
  try {
    await apply(upgrade, 6);
    await upgrade.query(`
      INSERT INTO companies (id, name, slug, status, created_at, updated_at)
      VALUES ('migration-company', 'Migration Company', 'migration-company', 'ACTIVE', NOW()::text, NOW()::text);
      INSERT INTO users (id, name, email, password_hash, role, company_id, status, created_at, updated_at)
      VALUES ('migration-user', 'Migration User', 'migration@example.invalid', 'hash', 'EMPLOYEE', 'migration-company', 'ACTIVE', NOW()::text, NOW()::text);
      INSERT INTO diagnosis_submissions (
        id, company_id, user_id, submission_type, questionnaire_id, respondent_role,
        department, status, created_at, updated_at
      ) VALUES (
        'migration-submission', 'migration-company', 'migration-user', 'RESEARCH',
        'legacy', 'Analista', 'Operacoes', 'IN_PROGRESS', NOW()::text, NOW()::text
      );
    `);
    await apply(upgrade);
    await apply(upgrade);
    const applied = await upgrade.query<{ total: string }>('SELECT COUNT(*)::text total FROM schema_migrations');
    assert.equal(applied.rows[0]?.total, '7');
    const snapshot = await upgrade.query<{ respondent_department: string; respondent_job_function: string }>(`
      SELECT respondent_department, respondent_job_function
      FROM diagnosis_submissions WHERE id = 'migration-submission'
    `);
    assert.deepEqual(snapshot.rows[0], {
      respondent_department: 'Operacoes', respondent_job_function: 'Analista',
    });
  } finally {
    await upgrade.end();
  }

  console.log(JSON.stringify({ ok: true, fresh001To007: true, upgrade001To006Then007: true, idempotent: true, existingDataPreserved: true, migrationCount: 7 }));
} finally {
  for (const name of names) await drop(name);
  await administrator.end();
}
