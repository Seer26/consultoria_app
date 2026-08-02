import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { Client } from 'pg';

import { schemaStatements } from '../db/schema';
import type { MigrationTestHooks } from '../database/migrate-sqlite-to-postgres';

const tables = [
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
const businessTables = tables.filter((table) => table !== 'plans');
const scenarios = [
  'success',
  'import-failure',
  'count-failure',
  'orphan-failure',
  'identifier-failure',
] as const;
type Scenario = (typeof scenarios)[number];

function databaseUrl(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

async function withClient<Result>(
  connectionString: string,
  operation: (client: Client) => Promise<Result>,
): Promise<Result> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

function createFixture(filename: string, invalidRole = false): void {
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  for (const statement of schemaStatements) sqlite.exec(statement);
  const insert = (table: string, row: Record<string, unknown>) => {
    const columns = Object.keys(row);
    sqlite.prepare(
      `INSERT INTO "${table}" (${columns.map((name) => `"${name}"`).join(', ')}) ` +
      `VALUES (${columns.map((name) => `@${name}`).join(', ')})`,
    ).run(row);
  };
  const now = '2026-08-02T12:00:00.000Z';
  const later = '2026-09-01T12:00:00.000Z';
  sqlite.transaction(() => {
    insert('plans', { id: 'plan-starter', slug: 'starter', name: 'Starter', description: 'Synthetic Starter', status: 'ACTIVE', max_users: 5, max_research_submissions_monthly: 20, max_report_pdfs_monthly: 30, max_active_action_tasks: 100, max_ai_questions_monthly: 100, created_at: now, updated_at: now });
    insert('plans', { id: 'plan-growth', slug: 'growth', name: 'Growth', description: 'Synthetic Growth', status: 'ACTIVE', max_users: 20, max_research_submissions_monthly: 100, max_report_pdfs_monthly: 150, max_active_action_tasks: 500, max_ai_questions_monthly: 500, created_at: now, updated_at: now });
    for (const suffix of ['a', 'b']) {
      const companyId = `migration-company-${suffix}`;
      const userId = `migration-owner-${suffix}`;
      const submissionId = `migration-submission-${suffix}`;
      insert('companies', { id: companyId, name: `Synthetic Company ${suffix.toUpperCase()}`, slug: `migration-${suffix}`, status: 'ACTIVE', sector: 'Synthetic', size: 'SMALL', phone: null, responsible_name: `Synthetic Owner ${suffix.toUpperCase()}`, notes: 'Synthetic fixture', created_at: now, updated_at: now });
      insert('users', { id: userId, name: `Synthetic Owner ${suffix.toUpperCase()}`, email: `migration.${suffix}@example.invalid`, password_hash: 'synthetic-password-hash', role: invalidRole && suffix === 'a' ? 'INVALID_ROLE' : 'OWNER', company_id: companyId, created_at: now, updated_at: now, status: 'ACTIVE', auth_version: 0 });
      if (invalidRole) continue;
      insert('company_subscriptions', { id: `migration-subscription-${suffix}`, company_id: companyId, plan_id: suffix === 'a' ? 'plan-starter' : 'plan-growth', status: 'ACTIVE', current_period_start: now, current_period_end: later, created_at: now, updated_at: now });
      insert('diagnosis_submissions', { id: submissionId, company_id: companyId, user_id: userId, submission_type: 'DIAGNOSIS', questionnaire_id: `migration-questionnaire-${suffix}`, respondent_role: 'OWNER', department: 'Synthetic', status: 'COMPLETED', overall_score: 80, summary: 'Synthetic', critical_points: '[]', opportunities: '[]', recommendations: '[]', next_steps: '[]', pillar_scores: '{}', created_at: now, updated_at: now, completed_at: now });
      insert('diagnosis_answers', { id: `migration-answer-${suffix}`, submission_id: submissionId, question_id: `migration-question-${suffix}`, question: 'Synthetic question?', answer: 'Synthetic answer', pillar: 'STRATEGY', value: 4, score: 80, created_at: now });
      insert('action_tasks', { id: `migration-action-${suffix}`, submission_id: submissionId, pillar: 'STRATEGY', title: `Synthetic Action ${suffix}`, description: 'Synthetic', priority: 'HIGH', status: 'TODO' });
      insert('action_plan_tasks', { id: `migration-plan-task-${suffix}`, company_id: companyId, submission_id: submissionId, title: `Synthetic Task ${suffix}`, description: 'Synthetic', pillar: 'STRATEGY', priority: 'HIGH', status: 'TODO', due_date: later, responsible_user_id: userId, source: 'MANUAL', created_at: now, updated_at: now, completed_at: null });
      insert('usage_counters', { id: `migration-usage-${suffix}`, company_id: companyId, feature: 'REPORT_PDF', period: '2026-08', quantity: 1, updated_at: now });
      insert('company_subscription_events', { id: `migration-event-${suffix}`, company_id: companyId, previous_plan_id: null, new_plan_id: suffix === 'a' ? 'plan-starter' : 'plan-growth', actor_user_id: userId, origin: 'MANUAL_ADMIN', reason: 'Synthetic', created_at: now });
      insert('password_reset_tokens', { id: `migration-reset-${suffix}`, user_id: userId, token_hash: `migration-token-${suffix}`, created_at: now, expires_at: later, used_at: null, requested_ip_hash: 'synthetic', request_id: `migration-request-${suffix}`, status: 'PENDING' });
      insert('legal_acceptances', { id: `migration-legal-${suffix}`, user_id: userId, company_id: companyId, document_type: 'TERMS_OF_USE', document_version: 'synthetic-v1', accepted_at: now, ip_hash: 'synthetic', request_id: `migration-legal-request-${suffix}`, origin: 'SYNTHETIC_TEST', metadata: '{"synthetic":true}' });
    }
  })();
  assert.equal(sqlite.pragma('quick_check', { simple: true }), 'ok');
  assert.deepEqual(sqlite.pragma('foreign_key_check'), []);
  sqlite.close();
}

function addManipulatedIdentifier(filename: string): void {
  const sqlite = new Database(filename);
  sqlite.exec(
    'ALTER TABLE companies ADD COLUMN "unexpected""; DROP TABLE companies; --" TEXT',
  );
  assert.equal(sqlite.pragma('quick_check', { simple: true }), 'ok');
  sqlite.close();
}

async function runChild(scenario: Scenario, sourcePath: string): Promise<void> {
  const { migrateSqliteToPostgres } = await import(
    '../database/migrate-sqlite-to-postgres'
  );
  const options = {
    sourcePath,
    dryRun: false,
    allowNonEmptyDestination: false,
    allowProductionDestination: false,
    allowOperationalBackup: false,
    confirmed: true,
  };
  if (scenario === 'success') {
    const dryRun = await migrateSqliteToPostgres({ ...options, dryRun: true });
    assert.equal(dryRun.dryRun, true);
    assert.ok(Object.values(dryRun.importedCounts).every((count) => count === 0));
    const result = await migrateSqliteToPostgres(options);
    assert.deepEqual(result.destinationCounts, result.sourceCounts);
    assert.ok(Object.values(result.orphanCounts).every((count) => count === 0));
    console.log(JSON.stringify({ ok: true, scenario, dryRun: true, committed: true }));
    return;
  }
  let expected: RegExp;
  let hooks: MigrationTestHooks | undefined;
  if (scenario === 'identifier-failure') {
    expected = /SQLITE_SCHEMA_UNEXPECTED_IDENTIFIER/;
  } else if (scenario === 'import-failure') {
    expected = /users_role_check/;
  } else if (scenario === 'count-failure') {
    expected = /MIGRATION_COUNT_MISMATCH:action_tasks/;
    hooks = {
      beforeValidation: async (client: Client) => {
        await client.query(
          'DELETE FROM action_tasks WHERE id = (SELECT id FROM action_tasks LIMIT 1)',
        );
      },
    };
  } else {
    expected = /MIGRATION_ORPHAN_RECORDS_FOUND/;
    hooks = {
      beforeValidation: async (client: Client) => {
        await client.query("SET LOCAL session_replication_role = 'replica'");
        await client.query(
          "UPDATE action_plan_tasks SET company_id = 'missing-synthetic-company' " +
          'WHERE id = (SELECT id FROM action_plan_tasks LIMIT 1)',
        );
        await client.query("SET LOCAL session_replication_role = 'origin'");
      },
    };
  }
  await assert.rejects(
    () => migrateSqliteToPostgres(options, hooks),
    expected,
  );
  console.log(JSON.stringify({ ok: true, scenario, rolledBack: true }));
}

async function parent(): Promise<void> {
  dotenv.config({ path: '.env.local' });
  const baseUrl = process.env.DATABASE_URL?.trim();
  assert.ok(baseUrl, 'POSTGRES_MIGRATOR_TEST_REQUIRES_DATABASE_URL');
  const parsed = new URL(baseUrl);
  assert.equal(decodeURIComponent(parsed.pathname.replace(/^\//, '')), 'consultoria_dev');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consultoria-migrator-'));
  const validSource = path.join(tempDir, 'migration-valid.sqlite');
  const invalidSource = path.join(tempDir, 'migration-invalid.sqlite');
  const manipulatedSource = path.join(tempDir, 'migration-manipulated.sqlite');
  createFixture(validSource);
  createFixture(invalidSource, true);
  createFixture(manipulatedSource);
  addManipulatedIdentifier(manipulatedSource);
  const names = Object.fromEntries(
    scenarios.map((scenario) => [scenario, `consultoria_migrator_${scenario.replace(/-/g, '_')}_test`]),
  ) as Record<Scenario, string>;
  const created: string[] = [];
  try {
    await withClient(baseUrl, async (client) => {
      for (const name of Object.values(names)) {
        const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
        assert.equal(exists.rowCount, 0, `TEMP_DATABASE_ALREADY_EXISTS:${name}`);
        await client.query(`CREATE DATABASE ${name}`);
        created.push(name);
      }
    });
    for (const scenario of scenarios) {
      const source = scenario === 'import-failure'
        ? invalidSource
        : scenario === 'identifier-failure'
          ? manipulatedSource
          : validSource;
      const child = spawnSync(
        process.execPath,
        ['--import', 'tsx', fileURLToPath(import.meta.url), `--scenario=${scenario}`, `--source=${source}`],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_ENV: 'test',
            DATABASE_URL: databaseUrl(baseUrl, names[scenario]),
          },
          encoding: 'utf8',
        },
      );
      if (child.status !== 0) {
        throw new Error(`SCENARIO_FAILED:${scenario}:${child.stderr || child.stdout}`);
      }
      if (scenario === 'identifier-failure') {
        await withClient(databaseUrl(baseUrl, names[scenario]), async (client) => {
          const migratedTables = await client.query(
            'SELECT COUNT(*)::int AS total FROM information_schema.tables ' +
            "WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
            [[...tables]],
          );
          assert.equal(Number(migratedTables.rows[0].total), 0);
        });
        continue;
      }
      const counts: Record<string, number> = await withClient<Record<string, number>>(
        databaseUrl(baseUrl, names[scenario]),
        async (client) => {
        const result: Record<string, number> = {};
        for (const table of tables) {
          result[table] = Number((await client.query(`SELECT COUNT(*)::int AS total FROM "${table}"`)).rows[0].total);
        }
        return result;
        },
      );
      if (scenario === 'success') {
        assert.ok(tables.every((table) => counts[table] === 2));
        await withClient(databaseUrl(baseUrl, names[scenario]), async (client) => {
          const relationships = await client.query(
            'SELECT COUNT(*)::int AS total FROM users u JOIN companies c ON c.id=u.company_id ' +
            'JOIN diagnosis_submissions s ON s.company_id=c.id AND s.user_id=u.id ' +
            'JOIN action_plan_tasks t ON t.company_id=c.id AND t.submission_id=s.id ' +
            'AND t.responsible_user_id=u.id',
          );
          assert.equal(Number(relationships.rows[0].total), 2);
        });
      } else {
        assert.equal(counts.plans, 2);
        assert.ok(businessTables.every((table) => counts[table] === 0));
      }
    }
    console.log(JSON.stringify({
      ok: true,
      success: true,
      importFailureRollback: true,
      countValidationRollback: true,
      orphanValidationRollback: true,
      manipulatedIdentifierRejectedBeforeImport: true,
      dryRunNoPersistence: true,
    }));
  } finally {
    await withClient(baseUrl, async (client) => {
      for (const name of created.reverse()) {
        await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name]);
        await client.query(`DROP DATABASE ${name}`);
      }
    });
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const scenarioArgument = process.argv.find((argument) => argument.startsWith('--scenario='));
  if (scenarioArgument) {
    const scenario = scenarioArgument.slice('--scenario='.length) as Scenario;
    assert.ok(scenarios.includes(scenario));
    const source = process.argv.find((argument) => argument.startsWith('--source='))?.slice('--source='.length);
    assert.ok(source);
    await runChild(scenario, source);
    return;
  }
  await parent();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
