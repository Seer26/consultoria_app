import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import { Client } from 'pg';

import { bootstrapFirstAdmin } from '../database/admin-bootstrap';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
assert(/^postgres(?:ql)?:\/\//.test(databaseUrl), 'ADMIN_BOOTSTRAP_TEST_POSTGRES_REQUIRED');
assert(!/\/(consultoria_local|consultoria_dev)(?:\?|$)/.test(databaseUrl),
  'ADMIN_BOOTSTRAP_TEST_ISOLATED_DATABASE_REQUIRED');

const syntheticPassword = ['Bootstrap', 'Safe', '42!'].join('-');
const normalizedEmail = 'first.admin@example.invalid';
const bootstrapFile = fileURLToPath(new URL('../database/admin-bootstrap.ts', import.meta.url));
const isolatedWorkingDirectory = path.resolve(os.tmpdir());

function bootstrapEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    BOOTSTRAP_CONFIRM: 'CREATE-FIRST-ADMIN',
    BOOTSTRAP_ADMIN_NAME: 'Synthetic Bootstrap Admin',
    BOOTSTRAP_ADMIN_EMAIL: '  FIRST.ADMIN@EXAMPLE.INVALID  ',
    BOOTSTRAP_ADMIN_PASSWORD: syntheticPassword,
    ...overrides,
  };
}

async function expectFailure(expected: string, overrides: NodeJS.ProcessEnv): Promise<void> {
  try {
    await bootstrapFirstAdmin(bootstrapEnv(overrides));
    throw new Error(`EXPECTED_FAILURE_NOT_RAISED:${expected}`);
  } catch (error) {
    assert(error instanceof Error && error.message === expected,
      `UNEXPECTED_BOOTSTRAP_FAILURE:${expected}`);
  }
}

async function clearSyntheticData(client: Client): Promise<void> {
  await client.query("DELETE FROM audit_events WHERE event_type = 'ADMIN_BOOTSTRAP_CREATED'");
  await client.query("DELETE FROM users WHERE email LIKE '%@example.invalid'");
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await clearSyntheticData(client);

    const result = await bootstrapFirstAdmin(bootstrapEnv());
    assert(result.maskedEmail !== normalizedEmail, 'ADMIN_BOOTSTRAP_EMAIL_NOT_MASKED');
    assert(!result.idPreview.includes('-'), 'ADMIN_BOOTSTRAP_ID_PREVIEW_INVALID');

    const created = await client.query<{
      id: string; email: string; password_hash: string; role: string; status: string;
      company_id: string | null; auth_version: number;
    }>(`SELECT id, email, password_hash, role, status, company_id, auth_version
        FROM users WHERE email = $1`, [normalizedEmail]);
    const admin = created.rows[0];
    assert(admin, 'ADMIN_BOOTSTRAP_USER_NOT_CREATED');
    assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(admin.id), 'ADMIN_BOOTSTRAP_UUID_INVALID');
    assert(admin.role === 'ADMIN', 'ADMIN_BOOTSTRAP_ROLE_INVALID');
    assert(admin.status === 'ACTIVE', 'ADMIN_BOOTSTRAP_STATUS_INVALID');
    assert(admin.company_id === null, 'ADMIN_BOOTSTRAP_COMPANY_MUST_BE_NULL');
    assert(Number(admin.auth_version) === 0, 'ADMIN_BOOTSTRAP_AUTH_VERSION_INVALID');
    assert(await bcrypt.compare(syntheticPassword, admin.password_hash),
      'ADMIN_BOOTSTRAP_HASH_INCOMPATIBLE');

    const audit = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM audit_events
       WHERE actor_user_id = $1 AND event_type = 'ADMIN_BOOTSTRAP_CREATED'`,
      [admin.id],
    );
    assert(audit.rows[0]?.count === '1', 'ADMIN_BOOTSTRAP_AUDIT_MISSING');

    const [{ AuthRepository }, { AuthService }] = await Promise.all([
      import('../modules/auth/auth.repository'), import('../modules/auth/auth.service'),
    ]);
    const login = await new AuthService(new AuthRepository()).login({
      email: normalizedEmail, password: syntheticPassword,
    });
    assert(login.user.id === admin.id && login.user.role === 'ADMIN',
      'ADMIN_BOOTSTRAP_LOGIN_FAILED');
    assert(login.user.companyId === null, 'ADMIN_BOOTSTRAP_LOGIN_COMPANY_INVALID');

    await expectFailure('ADMIN_ALREADY_EXISTS', {
      BOOTSTRAP_ADMIN_EMAIL: 'second.admin@example.invalid',
    });
    const adminCount = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE role = 'ADMIN'",
    );
    assert(adminCount.rows[0]?.count === '1', 'ADMIN_BOOTSTRAP_SECOND_ADMIN_CREATED');

    await clearSyntheticData(client);
    const concurrentResults = await Promise.allSettled([
      bootstrapFirstAdmin(bootstrapEnv({
        BOOTSTRAP_ADMIN_EMAIL: 'concurrent.one@example.invalid',
      })),
      bootstrapFirstAdmin(bootstrapEnv({
        BOOTSTRAP_ADMIN_EMAIL: 'concurrent.two@example.invalid',
      })),
    ]);
    const concurrentSuccesses = concurrentResults.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof bootstrapFirstAdmin>>> =>
        result.status === 'fulfilled',
    );
    const concurrentFailures = concurrentResults.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    assert(concurrentSuccesses.length === 1, 'ADMIN_BOOTSTRAP_CONCURRENT_SUCCESS_COUNT');
    assert(concurrentFailures.length === 1, 'ADMIN_BOOTSTRAP_CONCURRENT_FAILURE_COUNT');
    assert(concurrentFailures[0]?.reason instanceof Error &&
      concurrentFailures[0].reason.message === 'ADMIN_ALREADY_EXISTS',
    'ADMIN_BOOTSTRAP_CONCURRENT_GUARD_FAILED');
    const concurrentAdminCount = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE role = 'ADMIN'",
    );
    assert(concurrentAdminCount.rows[0]?.count === '1',
      'ADMIN_BOOTSTRAP_CONCURRENT_CREATED_MULTIPLE');

    const nowForSecondAdmin = new Date().toISOString();
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, company_id,
        created_at, updated_at, status, auth_version)
       VALUES ($1, 'Synthetic Second Admin', 'second.seeded.admin@example.invalid',
        'synthetic-not-used', 'ADMIN', NULL, $2, $2, 'ACTIVE', 0)`,
      [randomUUID(), nowForSecondAdmin],
    );
    await expectFailure('ADMIN_ALREADY_EXISTS', {
      BOOTSTRAP_ADMIN_EMAIL: 'third.admin@example.invalid',
    });
    const multipleAdminCount = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE role = 'ADMIN'",
    );
    assert(multipleAdminCount.rows[0]?.count === '2', 'ADMIN_BOOTSTRAP_MULTI_ADMIN_GUARD');

    await clearSyntheticData(client);
    await expectFailure('ADMIN_BOOTSTRAP_PASSWORD_POLICY', {
      BOOTSTRAP_ADMIN_PASSWORD: '12345678',
    });
    await expectFailure('ADMIN_EMAIL_INVALID', { BOOTSTRAP_ADMIN_EMAIL: 'invalid-email' });
    await expectFailure('ADMIN_BOOTSTRAP_CONFIRMATION_REQUIRED', { BOOTSTRAP_CONFIRM: '' });
    await expectFailure('ADMIN_BOOTSTRAP_CONFIRMATION_REQUIRED', {
      BOOTSTRAP_CONFIRM: 'WRONG-CONFIRMATION',
    });
    await expectFailure('ADMIN_NAME_REQUIRED', { BOOTSTRAP_ADMIN_NAME: ' ' });
    await expectFailure('ADMIN_BOOTSTRAP_FORBIDDEN_IN_PRODUCTION', { NODE_ENV: 'production' });
    await expectFailure('POSTGRES_PROVIDER_REQUIRED', { DATABASE_URL: '' });

    const now = new Date().toISOString();
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, company_id,
        created_at, updated_at, status, auth_version)
       VALUES ($1, 'Synthetic Owner', $2, 'synthetic-not-used', 'OWNER', NULL,
        $3, $3, 'ACTIVE', 0)`,
      [randomUUID(), normalizedEmail, now],
    );
    await expectFailure('ADMIN_EMAIL_ALREADY_EXISTS', {});
    await clearSyntheticData(client);

    await client.query(`CREATE OR REPLACE FUNCTION reject_bootstrap_admin_test()
      RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic rollback'; END $$`);
    await client.query(`CREATE TRIGGER reject_bootstrap_admin_test
      BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION reject_bootstrap_admin_test()`);
    await expectFailure('ADMIN_BOOTSTRAP_TRANSACTION_FAILED', {});
    const afterRollback = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM users WHERE email = $1', [normalizedEmail],
    );
    assert(afterRollback.rows[0]?.count === '0', 'ADMIN_BOOTSTRAP_ROLLBACK_FAILED');
    const failedTransactionChild = spawnSync(process.execPath,
      ['--import', import.meta.resolve('tsx'), bootstrapFile], {
        cwd: isolatedWorkingDirectory,
        env: bootstrapEnv(),
        encoding: 'utf8',
        windowsHide: true,
      });
    const failedTransactionOutput =
      `${failedTransactionChild.stdout ?? ''}${failedTransactionChild.stderr ?? ''}`;
    assert(failedTransactionChild.status !== 0,
      'ADMIN_BOOTSTRAP_TRANSACTION_EXIT_CODE_INVALID');
    assert(failedTransactionOutput.includes('ADMIN_BOOTSTRAP_TRANSACTION_FAILED'),
      'ADMIN_BOOTSTRAP_TRANSACTION_CODE_MISSING');
    assert(failedTransactionOutput.includes('consultoria_admin_guard_test'),
      'ADMIN_BOOTSTRAP_TRANSACTION_DATABASE_MISSING');
    assert(!failedTransactionOutput.includes(syntheticPassword) &&
      !failedTransactionOutput.includes(databaseUrl) &&
      !failedTransactionOutput.includes(normalizedEmail) &&
      !failedTransactionOutput.includes('password_hash') &&
      !failedTransactionOutput.toLowerCase().includes('token'),
    'ADMIN_BOOTSTRAP_TRANSACTION_OUTPUT_EXPOSED_SECRET');
    await client.query('DROP TRIGGER reject_bootstrap_admin_test ON users');
    await client.query('DROP FUNCTION reject_bootstrap_admin_test()');

    const child = spawnSync(process.execPath,
      ['--import', import.meta.resolve('tsx'), bootstrapFile], {
        cwd: isolatedWorkingDirectory, env: bootstrapEnv(), encoding: 'utf8', windowsHide: true,
      });
    const output = `${child.stdout ?? ''}${child.stderr ?? ''}`;
    assert(child.status === 0, 'ADMIN_BOOTSTRAP_CLI_FAILED');
    assert(!output.includes(syntheticPassword), 'ADMIN_BOOTSTRAP_OUTPUT_EXPOSED_PASSWORD');
    assert(!output.includes(databaseUrl), 'ADMIN_BOOTSTRAP_OUTPUT_EXPOSED_DATABASE_URL');
    assert(!output.includes(normalizedEmail), 'ADMIN_BOOTSTRAP_OUTPUT_EXPOSED_EMAIL');
    assert(!output.includes('password_hash') && !output.includes('$2'),
      'ADMIN_BOOTSTRAP_OUTPUT_EXPOSED_HASH');
    assert(!output.toLowerCase().includes('token'), 'ADMIN_BOOTSTRAP_OUTPUT_EXPOSED_TOKEN');
    assert(output.includes('"adminCreated":true'), 'ADMIN_BOOTSTRAP_OUTPUT_INVALID');

    const existingAdminChild = spawnSync(process.execPath,
      ['--import', import.meta.resolve('tsx'), bootstrapFile], {
        cwd: isolatedWorkingDirectory,
        env: bootstrapEnv({ BOOTSTRAP_ADMIN_EMAIL: 'blocked.admin@example.invalid' }),
        encoding: 'utf8',
        windowsHide: true,
      });
    const existingAdminOutput =
      `${existingAdminChild.stdout ?? ''}${existingAdminChild.stderr ?? ''}`;
    assert(existingAdminChild.status !== 0, 'ADMIN_BOOTSTRAP_EXISTING_EXIT_CODE_INVALID');
    assert(existingAdminOutput.includes('ADMIN_ALREADY_EXISTS'),
      'ADMIN_BOOTSTRAP_EXISTING_CODE_MISSING');
    assert(existingAdminOutput.includes('consultoria_admin_guard_test'),
      'ADMIN_BOOTSTRAP_EXISTING_DATABASE_MISSING');
    assert(!existingAdminOutput.includes(syntheticPassword) &&
      !existingAdminOutput.includes(databaseUrl) &&
      !existingAdminOutput.includes(normalizedEmail) &&
      !existingAdminOutput.toLowerCase().includes('token'),
    'ADMIN_BOOTSTRAP_EXISTING_OUTPUT_EXPOSED_SECRET');

    await clearSyntheticData(client);
    const weakChild = spawnSync(process.execPath,
      ['--import', import.meta.resolve('tsx'), bootstrapFile], {
        cwd: isolatedWorkingDirectory,
        env: bootstrapEnv({ BOOTSTRAP_ADMIN_PASSWORD: '12345678' }),
        encoding: 'utf8',
        windowsHide: true,
      });
    const weakOutput = `${weakChild.stdout ?? ''}${weakChild.stderr ?? ''}`;
    assert(weakChild.status !== 0, 'ADMIN_BOOTSTRAP_WEAK_PASSWORD_EXIT_CODE_INVALID');
    assert(weakOutput.includes('ADMIN_BOOTSTRAP_PASSWORD_POLICY'),
      'ADMIN_BOOTSTRAP_WEAK_PASSWORD_CODE_MISSING');
    assert(!weakOutput.includes('ADMIN_BOOTSTRAP_FAILED'),
      'ADMIN_BOOTSTRAP_WEAK_PASSWORD_GENERIC_ERROR');
    assert(!weakOutput.includes('12345678') && !weakOutput.includes(databaseUrl),
      'ADMIN_BOOTSTRAP_WEAK_PASSWORD_OUTPUT_EXPOSED_SECRET');

    const sqliteEnvironment = bootstrapEnv();
    delete sqliteEnvironment.DATABASE_URL;
    const rejectedChild = spawnSync(process.execPath,
      ['--import', import.meta.resolve('tsx'), bootstrapFile], {
        cwd: isolatedWorkingDirectory, env: sqliteEnvironment, encoding: 'utf8', windowsHide: true,
      });
    const rejectedOutput = `${rejectedChild.stdout ?? ''}${rejectedChild.stderr ?? ''}`;
    assert(rejectedChild.status !== 0, 'ADMIN_BOOTSTRAP_SQLITE_EXIT_CODE_INVALID');
    assert(rejectedOutput.includes('POSTGRES_PROVIDER_REQUIRED'),
      'ADMIN_BOOTSTRAP_SQLITE_REJECTION_MISSING');
    assert(!rejectedOutput.includes(syntheticPassword) && !rejectedOutput.includes(normalizedEmail),
      'ADMIN_BOOTSTRAP_REJECTION_EXPOSED_CREDENTIAL');

    console.log('Admin bootstrap E2E passed.');
  } finally {
    await client.query('DROP TRIGGER IF EXISTS reject_bootstrap_admin_test ON users')
      .catch(() => undefined);
    await client.query('DROP FUNCTION IF EXISTS reject_bootstrap_admin_test()')
      .catch(() => undefined);
    await clearSyntheticData(client).catch(() => undefined);
    await client.end();
    const { dataSource } = await import('../database/data-source');
    await dataSource.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'ADMIN_BOOTSTRAP_TEST_FAILED');
  process.exitCode = 1;
});
