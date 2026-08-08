import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import { Client } from 'pg';

import { assertPasswordPolicy } from '../modules/auth/password-policy';
import { audit } from '../shared/audit';
import { logger } from '../shared/logger';

const BOOTSTRAP_CONFIRMATION = 'CREATE-FIRST-ADMIN';
const EXPECTED_MIGRATIONS = [
  '001_initial_postgres_schema',
  '002_seed_required_plans',
  '003_security_beta',
  '004_legal_acceptances',
  '005_postgres_runtime_hardening',
] as const;
const REQUIRED_TABLES = [
  'schema_migrations', 'users', 'companies', 'plans',
  'password_reset_tokens', 'legal_acceptances', 'audit_events',
] as const;
const REQUIRED_USER_COLUMNS = [
  'id', 'name', 'email', 'password_hash', 'role', 'company_id',
  'created_at', 'updated_at', 'status', 'auth_version',
] as const;

class AdminBootstrapError extends Error {
  constructor(readonly code: string, readonly database?: string) {
    super(code);
    this.name = 'AdminBootstrapError';
  }
}

interface BootstrapInput {
  name: string;
  email: string;
  password: string;
  databaseUrl: string;
  databaseName: string;
}

export interface BootstrapResult {
  idPreview: string;
  maskedEmail: string;
  database: string;
}

function fail(code: string): never {
  throw new AdminBootstrapError(code);
}

function parseDatabaseUrl(value: string | undefined) {
  const databaseUrl = value?.trim();
  if (!databaseUrl) fail('POSTGRES_PROVIDER_REQUIRED');
  try {
    const parsed = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      fail('POSTGRES_PROVIDER_REQUIRED');
    }
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!databaseName) fail('POSTGRES_DATABASE_NAME_REQUIRED');
    return { databaseUrl, databaseName };
  } catch (error) {
    if (error instanceof AdminBootstrapError) throw error;
    fail('POSTGRES_DATABASE_URL_INVALID');
  }
}

function readInput(rawEnv: NodeJS.ProcessEnv): BootstrapInput {
  if (rawEnv.NODE_ENV?.trim().toLowerCase() === 'production') {
    fail('ADMIN_BOOTSTRAP_FORBIDDEN_IN_PRODUCTION');
  }
  const { databaseUrl, databaseName } = parseDatabaseUrl(rawEnv.DATABASE_URL);
  if (rawEnv.BOOTSTRAP_CONFIRM !== BOOTSTRAP_CONFIRMATION) {
    fail('ADMIN_BOOTSTRAP_CONFIRMATION_REQUIRED');
  }
  const name = rawEnv.BOOTSTRAP_ADMIN_NAME?.trim() ?? '';
  if (!name) fail('ADMIN_NAME_REQUIRED');
  const email = rawEnv.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('ADMIN_EMAIL_INVALID');
  const password = rawEnv.BOOTSTRAP_ADMIN_PASSWORD ?? '';
  if (!password) fail('ADMIN_PASSWORD_REQUIRED');
  try {
    assertPasswordPolicy(password, email);
  } catch {
    fail('ADMIN_BOOTSTRAP_PASSWORD_POLICY');
  }
  return { name, email, password, databaseUrl, databaseName };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const domainParts = domain.split('.');
  const host = domainParts.shift() ?? '';
  const suffix = domainParts.length > 0 ? `.${domainParts.join('.')}` : '';
  return `${local.slice(0, 1)}***@${host.slice(0, 1)}***${suffix}`;
}

async function validateDatabase(client: Client): Promise<void> {
  const tables = await client.query<{ table_name: string }>(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `);
  const existingTables = new Set(tables.rows.map((row) => row.table_name));
  if (REQUIRED_TABLES.some((table) => !existingTables.has(table))) {
    fail('ADMIN_BOOTSTRAP_SCHEMA_INVALID');
  }
  const columns = await client.query<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `);
  const existingColumns = new Set(columns.rows.map((row) => row.column_name));
  if (REQUIRED_USER_COLUMNS.some((column) => !existingColumns.has(column))) {
    fail('ADMIN_BOOTSTRAP_SCHEMA_INVALID');
  }
  const migrations = await client.query<{ id: string }>(
    'SELECT id FROM schema_migrations ORDER BY id',
  );
  const applied = new Set(migrations.rows.map((row) => row.id));
  if (migrations.rows.length !== EXPECTED_MIGRATIONS.length ||
      EXPECTED_MIGRATIONS.some((migration) => !applied.has(migration))) {
    fail('ADMIN_BOOTSTRAP_MIGRATIONS_NOT_READY');
  }
  const plans = await client.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count FROM plans
    WHERE slug IN ('starter', 'growth') AND status = 'ACTIVE'
  `);
  if (plans.rows[0]?.count !== '2') fail('ADMIN_BOOTSTRAP_PLANS_NOT_READY');
}

export async function bootstrapFirstAdmin(
  rawEnv: NodeJS.ProcessEnv = process.env,
): Promise<BootstrapResult> {
  const input = readInput(rawEnv);
  const client = new Client({ connectionString: input.databaseUrl });
  const id = randomUUID();
  const now = new Date().toISOString();
  let passwordHash = '';
  let transactionStarted = false;
  let committed = false;
  let phase = 'connect';
  try {
    await client.connect();
    phase = 'begin';
    await client.query('BEGIN');
    transactionStarted = true;
    phase = 'lock';
    await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
    phase = 'validate_database';
    await validateDatabase(client);
    phase = 'admin_guard';
    const admins = await client.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM users WHERE role = 'ADMIN') AS exists`,
    );
    const adminExists = admins.rows[0]?.exists;
    if (typeof adminExists !== 'boolean') fail('ADMIN_BOOTSTRAP_ADMIN_GUARD_INVALID');
    if (adminExists === true) fail('ADMIN_ALREADY_EXISTS');
    phase = 'duplicate_email_guard';
    const duplicate = await client.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = $1) AS exists',
      [input.email],
    );
    const duplicateEmailExists = duplicate.rows[0]?.exists;
    if (typeof duplicateEmailExists !== 'boolean') {
      fail('ADMIN_BOOTSTRAP_EMAIL_GUARD_INVALID');
    }
    if (duplicateEmailExists === true) fail('ADMIN_EMAIL_ALREADY_EXISTS');
    phase = 'hash_password';
    passwordHash = await bcrypt.hash(input.password, 10);
    input.password = '';
    if (rawEnv === process.env) delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    phase = 'insert_user';
    await client.query(
      `INSERT INTO users (
        id, name, email, password_hash, role, company_id,
        created_at, updated_at, status, auth_version
      ) VALUES ($1, $2, $3, $4, 'ADMIN', NULL, $5, $5, 'ACTIVE', 0)`,
      [id, input.name, input.email, passwordHash, now],
    );
    phase = 'insert_audit';
    await client.query(
      `INSERT INTO audit_events (
        id, company_id, actor_user_id, event_type, result, metadata, created_at
      ) VALUES ($1, NULL, $2, 'ADMIN_BOOTSTRAP_CREATED', 'SUCCESS', $3::jsonb, NOW())`,
      [randomUUID(), id, JSON.stringify({ source: 'admin:bootstrap' })],
    );
    phase = 'commit';
    await client.query('COMMIT');
    committed = true;
  } catch (error) {
    if (transactionStarted && !committed) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original */ }
    }
    if (error instanceof AdminBootstrapError) {
      throw new AdminBootstrapError(error.code, input.databaseName);
    }
    logger.error('admin_bootstrap_transaction_failed', {
      phase,
      database: input.databaseName,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    throw new AdminBootstrapError(
      'ADMIN_BOOTSTRAP_TRANSACTION_FAILED',
      input.databaseName,
    );
  } finally {
    passwordHash = '';
    input.password = '';
    await client.end().catch(() => undefined);
  }
  const result = {
    idPreview: id.slice(0, 8),
    maskedEmail: maskEmail(input.email),
    database: input.databaseName,
  };
  audit('admin_bootstrap_created', {
    adminIdPreview: result.idPreview,
    emailMasked: result.maskedEmail,
    database: result.database,
    result: 'SUCCESS',
  });
  return result;
}

const isCli = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isCli) {
  bootstrapFirstAdmin()
    .then((result) => console.log(JSON.stringify({ ok: true, adminCreated: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({
        ok: false,
        error: error instanceof AdminBootstrapError
          ? error.code
          : 'ADMIN_BOOTSTRAP_TRANSACTION_FAILED',
        ...(error instanceof AdminBootstrapError && error.database
          ? { database: error.database }
          : {}),
      }));
      process.exitCode = 1;
    });
}
