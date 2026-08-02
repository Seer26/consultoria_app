import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import { env } from '../config/env';
import { createPostgresClient } from './postgres';
import { runPostgresMigrations } from './migrate';

const orderedTables = [
  'companies',
  'plans',
  'users',
  'company_subscriptions',
  'diagnosis_submissions',
  'diagnosis_answers',
  'action_tasks',
  'action_plan_tasks',
  'usage_counters',
  'company_subscription_events',
  'password_reset_tokens',
  'legal_acceptances',
] as const;

type MigratedTable = (typeof orderedTables)[number];
type CountMap = Record<MigratedTable, number>;

const expectedColumns: Record<MigratedTable, readonly string[]> = {
  companies: [
    'id', 'name', 'slug', 'status', 'sector', 'size', 'phone',
    'responsible_name', 'notes', 'created_at', 'updated_at',
  ],
  plans: [
    'id', 'slug', 'name', 'description', 'status', 'max_users',
    'max_research_submissions_monthly', 'max_report_pdfs_monthly',
    'max_active_action_tasks', 'max_ai_questions_monthly', 'created_at',
    'updated_at',
  ],
  users: [
    'id', 'name', 'email', 'password_hash', 'role', 'company_id',
    'created_at', 'updated_at', 'status', 'auth_version',
  ],
  company_subscriptions: [
    'id', 'company_id', 'plan_id', 'status', 'current_period_start',
    'current_period_end', 'created_at', 'updated_at',
  ],
  diagnosis_submissions: [
    'id', 'company_id', 'user_id', 'submission_type', 'questionnaire_id',
    'respondent_role', 'department', 'status', 'overall_score', 'summary',
    'critical_points', 'opportunities', 'recommendations', 'next_steps',
    'pillar_scores', 'created_at', 'updated_at', 'completed_at',
  ],
  diagnosis_answers: [
    'id', 'submission_id', 'question_id', 'question', 'answer', 'pillar',
    'value', 'score', 'created_at',
  ],
  action_tasks: [
    'id', 'submission_id', 'pillar', 'title', 'description', 'priority',
    'status',
  ],
  action_plan_tasks: [
    'id', 'company_id', 'submission_id', 'title', 'description', 'pillar',
    'priority', 'status', 'due_date', 'responsible_user_id', 'source',
    'created_at', 'updated_at', 'completed_at',
  ],
  usage_counters: [
    'id', 'company_id', 'feature', 'period', 'quantity', 'updated_at',
  ],
  company_subscription_events: [
    'id', 'company_id', 'previous_plan_id', 'new_plan_id', 'actor_user_id',
    'origin', 'reason', 'created_at',
  ],
  password_reset_tokens: [
    'id', 'user_id', 'token_hash', 'created_at', 'expires_at', 'used_at',
    'requested_ip_hash', 'request_id', 'status',
  ],
  legal_acceptances: [
    'id', 'user_id', 'company_id', 'document_type', 'document_version',
    'accepted_at', 'ip_hash', 'request_id', 'origin', 'metadata',
  ],
};

function quoteExpectedIdentifier(
  identifier: string,
  allowedIdentifiers: readonly string[],
): string {
  if (
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier) ||
    !allowedIdentifiers.includes(identifier)
  ) {
    throw new Error('SQLITE_SCHEMA_UNEXPECTED_IDENTIFIER');
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteTable(table: MigratedTable): string {
  return quoteExpectedIdentifier(table, orderedTables);
}

export interface MigrationOptions {
  sourcePath: string;
  dryRun: boolean;
  allowNonEmptyDestination: boolean;
  allowProductionDestination: boolean;
  allowOperationalBackup: boolean;
  confirmed: boolean;
}

export interface MigrationTestHooks {
  beforeValidation?: (
    client: ReturnType<typeof createPostgresClient>,
  ) => Promise<void>;
}

function argumentValue(name: string): string | undefined {
  return process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

function readOptions(): MigrationOptions {
  const source = argumentValue('source');
  if (!source) throw new Error('SQLITE_SOURCE_REQUIRED_USE_SOURCE_ARGUMENT');
  return {
    sourcePath: path.resolve(source),
    dryRun: process.argv.includes('--dry-run'),
    allowNonEmptyDestination: process.argv.includes('--allow-non-empty-destination'),
    allowProductionDestination: process.argv.includes('--allow-production-destination'),
    allowOperationalBackup: process.argv.includes('--allow-operational-backup'),
    confirmed:
      argumentValue('confirm') === 'migrate-sqlite-to-postgres',
  };
}

function validateSource(options: MigrationOptions): Database.Database {
  if (!options.confirmed) throw new Error('EXPLICIT_MIGRATION_CONFIRMATION_REQUIRED');
  if (!env.databaseUrl) throw new Error('POSTGRES_DESTINATION_DATABASE_URL_REQUIRED');
  if (!fs.existsSync(options.sourcePath) || !fs.statSync(options.sourcePath).isFile()) {
    throw new Error('SQLITE_SOURCE_NOT_FOUND');
  }
  if (!['.sqlite', '.sqlite3', '.db'].includes(path.extname(options.sourcePath).toLowerCase())) {
    throw new Error('SQLITE_SOURCE_EXTENSION_REJECTED');
  }
  const filename = path.basename(options.sourcePath).toLowerCase();
  if (/(demo|e2e|test|staging)/.test(filename)) {
    throw new Error('SYNTHETIC_OR_TEST_SQLITE_SOURCE_REJECTED');
  }
  if (
    path.resolve(options.sourcePath) === path.resolve(env.databasePath)
  ) {
    throw new Error('OPERATIONAL_SQLITE_SOURCE_MUST_NOT_BE_MIGRATED_DIRECTLY');
  }
  if (
    filename.includes('backup') &&
    !options.allowOperationalBackup
  ) {
    throw new Error('OPERATIONAL_BACKUP_REQUIRES_EXPLICIT_AUTHORIZATION');
  }
  if (
    env.nodeEnv === 'production' &&
    !options.allowProductionDestination
  ) {
    throw new Error('PRODUCTION_DESTINATION_REQUIRES_EXPLICIT_AUTHORIZATION');
  }

  const sqlite = new Database(options.sourcePath, {
    readonly: true,
    fileMustExist: true,
  });
  const integrity = sqlite.pragma('quick_check', { simple: true });
  if (integrity !== 'ok') {
    sqlite.close();
    throw new Error('SQLITE_SOURCE_INTEGRITY_CHECK_FAILED');
  }
  return sqlite;
}

function sqliteTables(sqlite: Database.Database): Set<string> {
  const rows = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table'`,
  ).all() as Array<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

function sqliteCounts(sqlite: Database.Database): CountMap {
  const existing = sqliteTables(sqlite);
  return Object.fromEntries(
    orderedTables.map((table) => {
      if (!existing.has(table)) return [table, 0];
      const row = sqlite.prepare(`SELECT COUNT(*) AS total FROM ${quoteTable(table)}`).get() as {
        total: number;
      };
      return [table, Number(row.total)];
    }),
  ) as CountMap;
}

async function postgresCounts(client: ReturnType<typeof createPostgresClient>): Promise<CountMap> {
  const entries: Array<[MigratedTable, number]> = [];
  for (const table of orderedTables) {
    const result = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM ${quoteTable(table)}`,
    );
    entries.push([table, Number(result.rows[0]?.total ?? 0)]);
  }
  return Object.fromEntries(entries) as CountMap;
}

async function postgresTablesExist(
  client: ReturnType<typeof createPostgresClient>,
): Promise<boolean> {
  const result = await client.query<{ existing: string }>(
    `SELECT COUNT(*)::text AS existing
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [[...orderedTables]],
  );
  return Number(result.rows[0]?.existing ?? 0) === orderedTables.length;
}

async function assertDestinationEmpty(
  client: ReturnType<typeof createPostgresClient>,
  allowNonEmpty: boolean,
): Promise<void> {
  const counts = await postgresCounts(client);
  // Migrations seed the two required plans idempotently. They are schema
  // prerequisites, not user data, so they do not make a new destination dirty.
  const { plans: _seededPlans, ...businessCounts } = counts;
  const total = Object.values(businessCounts).reduce((sum, count) => sum + count, 0);
  if (total > 0 && !allowNonEmpty) {
    throw new Error('POSTGRES_DESTINATION_NOT_EMPTY');
  }
}

function tableColumns(sqlite: Database.Database, table: MigratedTable): string[] {
  return (sqlite.prepare(`PRAGMA table_info(${quoteTable(table)})`).all() as Array<{
    name: string;
  }>).map((row) => row.name);
}

function validateSourceSchema(sqlite: Database.Database): void {
  const existing = sqliteTables(sqlite);
  for (const table of existing) {
    if (table.startsWith('sqlite_')) continue;
    quoteExpectedIdentifier(table, orderedTables);
  }
  for (const table of orderedTables) {
    if (!existing.has(table)) continue;
    for (const column of tableColumns(sqlite, table)) {
      quoteExpectedIdentifier(column, expectedColumns[table]);
    }
  }
}

async function importTable(
  sqlite: Database.Database,
  client: ReturnType<typeof createPostgresClient>,
  table: MigratedTable,
): Promise<number> {
  if (!sqliteTables(sqlite).has(table)) return 0;
  const columns = tableColumns(sqlite, table);
  const tableSql = quoteTable(table);
  const rows = sqlite.prepare(`SELECT * FROM ${tableSql}`).all() as Array<
    Record<string, unknown>
  >;
  if (columns.length === 0 || rows.length === 0) return 0;
  const columnSql = columns
    .map((column) => quoteExpectedIdentifier(column, expectedColumns[table]))
    .join(', ');
  const placeholders = columns.map((_column, index) => `$${index + 1}`).join(', ');
  const sql = `
    INSERT INTO ${tableSql} (${columnSql})
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING
  `;
  for (const row of rows) {
    await client.query(sql, columns.map((column) => row[column] ?? null));
  }
  return rows.length;
}

async function orphanCounts(
  client: ReturnType<typeof createPostgresClient>,
): Promise<Record<string, number>> {
  const checks = {
    users_without_company: `
      SELECT COUNT(*) AS total FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.company_id IS NOT NULL AND c.id IS NULL
    `,
    submissions_without_company: `
      SELECT COUNT(*) AS total FROM diagnosis_submissions s
      LEFT JOIN companies c ON c.id = s.company_id
      WHERE c.id IS NULL
    `,
    answers_without_submission: `
      SELECT COUNT(*) AS total FROM diagnosis_answers a
      LEFT JOIN diagnosis_submissions s ON s.id = a.submission_id
      WHERE s.id IS NULL
    `,
    tasks_without_company: `
      SELECT COUNT(*) AS total FROM action_plan_tasks t
      LEFT JOIN companies c ON c.id = t.company_id
      WHERE c.id IS NULL
    `,
  };
  const result: Record<string, number> = {};
  for (const [name, sql] of Object.entries(checks)) {
    const query = await client.query<{ total: string }>(sql);
    result[name] = Number(query.rows[0]?.total ?? 0);
  }
  return result;
}

export async function migrateSqliteToPostgres(
  options = readOptions(),
  testHooks?: MigrationTestHooks,
): Promise<{
  dryRun: boolean;
  sourceCounts: CountMap;
  destinationCounts: CountMap;
  importedCounts: CountMap;
  orphanCounts: Record<string, number>;
}> {
  if (testHooks && env.nodeEnv !== 'test') {
    throw new Error('MIGRATION_TEST_HOOKS_REQUIRE_TEST_ENVIRONMENT');
  }
  const sqlite = validateSource(options);
  let client: ReturnType<typeof createPostgresClient> | null = null;
  try {
    validateSourceSchema(sqlite);
    const sourceCounts = sqliteCounts(sqlite);
    if (!options.dryRun) await runPostgresMigrations();
    client = createPostgresClient();
    await client.connect();

    if (options.dryRun) {
      const schemaReady = await postgresTablesExist(client);
      return {
        dryRun: true,
        sourceCounts,
        destinationCounts: schemaReady
          ? await postgresCounts(client)
          : Object.fromEntries(orderedTables.map((table) => [table, 0])) as CountMap,
        importedCounts: Object.fromEntries(
          orderedTables.map((table) => [table, 0]),
        ) as CountMap,
        orphanCounts: {},
      };
    }

    await assertDestinationEmpty(client, options.allowNonEmptyDestination);
    const importedCounts = {} as CountMap;
    await client.query('BEGIN');
    try {
      for (const table of orderedTables) {
        importedCounts[table] = await importTable(sqlite, client, table);
      }

      await testHooks?.beforeValidation?.(client);

      const destinationCounts = await postgresCounts(client);
      const orphans = await orphanCounts(client);
      const mismatches = orderedTables.filter(
        (table) => destinationCounts[table] !== sourceCounts[table],
      );
      if (mismatches.length > 0) {
        throw new Error(`MIGRATION_COUNT_MISMATCH:${mismatches.join(',')}`);
      }
      if (Object.values(orphans).some((count) => count !== 0)) {
        throw new Error('MIGRATION_ORPHAN_RECORDS_FOUND');
      }

      await client.query('COMMIT');
      return {
        dryRun: false,
        sourceCounts,
        destinationCounts,
        importedCounts,
        orphanCounts: orphans,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    sqlite.close();
    if (client) await client.end();
  }
}

const isCli = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isCli) {
  migrateSqliteToPostgres()
    .then((result) => {
      console.log(JSON.stringify({ ok: true, ...result }));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      }));
      process.exitCode = 1;
    });
}
