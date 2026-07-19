import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { database } from '../db/database';
import { createPostgresClient } from './postgres';
import { env } from '../config/env';

const requiredTables = [
  'companies',
  'users',
  'diagnosis_submissions',
  'diagnosis_answers',
  'action_tasks',
  'action_plan_tasks',
  'plans',
  'company_subscriptions',
  'usage_counters',
  'company_subscription_events',
];

async function validatePostgres(): Promise<void> {
  const client = createPostgresClient();
  await client.connect();

  try {
    const result = await client.query<{ table_name: string }>(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      `,
    );
    const existing = new Set(result.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((table) => !existing.has(table));

    if (missing.length > 0) {
      throw new Error(`MISSING_TABLES:${missing.join(',')}`);
    }

    const plans = await client.query<{ slug: string }>(
      `SELECT slug FROM plans WHERE slug IN ('starter', 'growth')`,
    );
    const planSlugs = new Set(plans.rows.map((row) => row.slug));

    if (!planSlugs.has('starter') || !planSlugs.has('growth')) {
      throw new Error('MISSING_REQUIRED_PLANS');
    }
  } finally {
    await client.end();
  }
}

function validateSqlite(): void {
  const rows = database
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      `,
    )
    .all() as Array<{ name: string }>;
  const existing = new Set(rows.map((row) => row.name));
  const missing = requiredTables.filter((table) => !existing.has(table));

  if (missing.length > 0) {
    throw new Error(`MISSING_TABLES:${missing.join(',')}`);
  }
}

async function validateDatabase(): Promise<void> {
  if (env.databaseProvider === 'postgres') {
    await validatePostgres();
  } else {
    validateSqlite();
  }
}

const isCli = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isCli) {
  validateDatabase()
    .then(() => {
      console.log(`Database validation passed (${env.databaseProvider}).`);
    })
    .catch((error) => {
      console.error('Database validation failed', error);
      process.exit(1);
    });
}
