import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPostgresClient } from './postgres';

interface MigrationFile {
  id: string;
  filename: string;
  sql: string;
}

function resolveMigrationsDir(): string {
  const sourceDir = path.resolve(process.cwd(), 'src/database/migrations');
  const distDir = path.resolve(process.cwd(), 'dist/database/migrations');

  if (existsSync(sourceDir)) return sourceDir;
  if (existsSync(distDir)) return distDir;
  throw new Error('POSTGRES_MIGRATIONS_DIRECTORY_NOT_FOUND');
}

export async function readPostgresMigrations(): Promise<MigrationFile[]> {
  const migrationsDir = resolveMigrationsDir();
  const entries = await fs.readdir(migrationsDir);

  const sqlFiles = entries
    .filter((entry) => entry.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    sqlFiles.map(async (filename) => ({
      id: filename.replace(/\.sql$/, ''),
      filename,
      sql: await fs.readFile(path.join(migrationsDir, filename), 'utf8'),
    })),
  );
}

export async function runPostgresMigrations(): Promise<void> {
  const client = createPostgresClient();
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);

    const appliedResult = await client.query<{ id: string }>(
      'SELECT id FROM schema_migrations',
    );
    const applied = new Set(appliedResult.rows.map((row) => row.id));
    const migrations = await readPostgresMigrations();

    for (const migration of migrations) {
      if (applied.has(migration.id)) {
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO schema_migrations (id, filename, applied_at)
           VALUES ($1, $2, $3)`,
          [migration.id, migration.filename, new Date().toISOString()],
        );
        await client.query('COMMIT');
        console.log(`Applied migration ${migration.filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    if (migrations.length === 0) {
      console.log('No migrations found.');
    }
  } finally {
    await client.end();
  }
}

export async function getPostgresMigrationStatus(): Promise<{
  applied: number;
  available: number;
  pending: string[];
}> {
  const migrations = await readPostgresMigrations();
  const client = createPostgresClient();
  await client.connect();
  try {
    const table = await client.query<{ exists: boolean }>(
      `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`,
    );
    if (!table.rows[0]?.exists) {
      return {
        applied: 0,
        available: migrations.length,
        pending: migrations.map((migration) => migration.id),
      };
    }
    const appliedResult = await client.query<{ id: string }>(
      'SELECT id FROM schema_migrations',
    );
    const applied = new Set(appliedResult.rows.map((row) => row.id));
    return {
      applied: applied.size,
      available: migrations.length,
      pending: migrations
        .filter((migration) => !applied.has(migration.id))
        .map((migration) => migration.id),
    };
  } finally {
    await client.end();
  }
}

const isCli = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isCli) {
  runPostgresMigrations().catch((error) => {
    console.error('Failed to run Postgres migrations', error);
    process.exit(1);
  });
}
