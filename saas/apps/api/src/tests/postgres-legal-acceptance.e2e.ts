import assert from 'node:assert/strict';
import http from 'node:http';

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { Client, type QueryResult } from 'pg';

dotenv.config({ path: '.env.local', override: true });

const enforcementMode = process.argv[2] ?? 'true';
if (!['true', 'false', 'absent'].includes(enforcementMode)) {
  throw new Error('POSTGRES_LEGAL_TEST_ENFORCEMENT_MODE_INVALID');
}
const enforcementRequired = enforcementMode === 'true';

const sourceDatabaseUrl = process.env.DATABASE_URL?.trim();
if (!sourceDatabaseUrl) {
  throw new Error('POSTGRES_LEGAL_TEST_REQUIRES_DATABASE_URL');
}
if (new URL(sourceDatabaseUrl).pathname.replace(/^\//, '') !== 'consultoria_local') {
  throw new Error('POSTGRES_LEGAL_TEST_REQUIRES_LOCAL_DATABASE');
}

const temporaryDatabase = 'consultoria_legal_acceptance_test';
if (!/^consultoria_[a-z_]+_test$/.test(temporaryDatabase)) {
  throw new Error('POSTGRES_LEGAL_TEST_DATABASE_NAME_REJECTED');
}

function databaseUrl(baseUrl: string, databaseName: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

const administrationUrl = databaseUrl(sourceDatabaseUrl, 'postgres');
const targetDatabaseUrl = databaseUrl(sourceDatabaseUrl, temporaryDatabase);

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.DATABASE_URL = targetDatabaseUrl;
process.env.JWT_SECRET = 'postgres-legal-e2e-secret-with-adequate-length';
if (enforcementMode === 'absent') {
  delete process.env.REQUIRE_LEGAL_ACCEPTANCE;
} else {
  process.env.REQUIRE_LEGAL_ACCEPTANCE = enforcementMode;
}
process.env.TERMS_VERSION = 'legal-e2e-v2';
process.env.PRIVACY_VERSION = 'legal-e2e-v2';

async function call<T>(
  baseUrl: string,
  method: string,
  pathname: string,
  options: { token?: string; body?: Record<string, unknown> } = {},
): Promise<{ status: number; body: T }> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return {
    status: response.status,
    body: await response.json() as T,
  };
}

interface PendingDocument {
  documentType: string;
  version: string;
  title: string;
  content: string;
}

async function main(): Promise<void> {
  const administrator = new Client({ connectionString: administrationUrl });
  let server: http.Server | null = null;
  let testClient: Client | null = null;
  let dataSource: { close(): Promise<void> } | null = null;
  let temporaryDatabaseCreated = false;

  await administrator.connect();
  try {
    const existingDatabase = await administrator.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists',
      [temporaryDatabase],
    );
    if (existingDatabase.rows[0]?.exists) {
      throw new Error('POSTGRES_LEGAL_TEST_DATABASE_ALREADY_EXISTS');
    }
    await administrator.query(`CREATE DATABASE "${temporaryDatabase}"`);
    temporaryDatabaseCreated = true;

    const { runPostgresMigrations } = await import('../database/migrate');
    await runPostgresMigrations();

    testClient = new Client({ connectionString: targetDatabaseUrl });
    await testClient.connect();
    const passwordHash = await bcrypt.hash('SenhaLegal123', 10);
    const now = new Date().toISOString();

    await testClient.query(
      `INSERT INTO companies (id, name, slug, status, created_at, updated_at)
       VALUES ('company-legal', 'Empresa Legal Sintetica', 'empresa-legal-sintetica',
               'ACTIVE', $1, $1)`,
      [now],
    );
    for (const user of [
      { id: 'admin-legal', role: 'ADMIN', companyId: null },
      { id: 'owner-legal', role: 'OWNER', companyId: 'company-legal' },
      { id: 'employee-legal', role: 'EMPLOYEE', companyId: 'company-legal' },
    ]) {
      await testClient.query(
        `INSERT INTO users (
           id, name, email, password_hash, role, company_id,
           created_at, updated_at, status, auth_version
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'ACTIVE', 0)`,
        [
          user.id,
          `Usuario ${user.role}`,
          `${user.role.toLowerCase()}.legal@example.test`,
          passwordHash,
          user.role,
          user.companyId,
          now,
        ],
      );
    }
    await testClient.query(
      `INSERT INTO legal_acceptances (
         id, user_id, company_id, document_type, document_version,
         accepted_at, origin
       ) VALUES (
         'owner-old-terms', 'owner-legal', 'company-legal',
         'TERMS_OF_USE', 'legal-e2e-v1', $1, 'API'
       )`,
      [now],
    );

    const { app } = await import('../app');
    const importedDataSource = await import('../database/data-source');
    const { isLegalAcceptanceRequired } = await import(
      '../modules/legal/legal.policy'
    );
    assert.equal(isLegalAcceptanceRequired(), enforcementRequired);
    dataSource = importedDataSource.dataSource;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const actors = [
      { id: 'admin-legal', role: 'ADMIN', route: '/dashboard/admin' },
      { id: 'owner-legal', role: 'OWNER', route: '/dashboard/company' },
      { id: 'employee-legal', role: 'EMPLOYEE', route: '/dashboard/employee' },
    ];

    for (const actor of actors) {
      const login = await call<{ token: string }>(baseUrl, 'POST', '/auth/login', {
        body: {
          email: `${actor.role.toLowerCase()}.legal@example.test`,
          password: 'SenhaLegal123',
        },
      });
      assert.equal(login.status, 200);

      const protectedRoute = await call<{ error?: string }>(
        baseUrl,
        'GET',
        actor.route,
        { token: login.body.token },
      );
      assert.equal(protectedRoute.status, enforcementRequired ? 428 : 200);
      if (enforcementRequired) {
        assert.equal(protectedRoute.body.error, 'LEGAL_ACCEPTANCE_REQUIRED');
      }

      const pending = await call<{
        enforcementRequired: boolean;
        pending: PendingDocument[];
      }>(
        baseUrl,
        'GET',
        '/legal/documents/pending',
        { token: login.body.token },
      );
      assert.equal(pending.status, 200);
      assert.equal(pending.body.enforcementRequired, enforcementRequired);
      assert.equal(pending.body.pending.length, 2);
      assert(pending.body.pending.every((document) =>
        document.version === 'legal-e2e-v2' &&
        document.title.length > 0 &&
        document.content.length > 0));

      if (actor.role === 'OWNER') {
        const employeeStillPending: QueryResult<{ total: string }> =
          await testClient.query<{ total: string }>(
            `SELECT COUNT(*)::text AS total FROM legal_acceptances
             WHERE user_id = 'employee-legal'`,
          );
        assert.equal(employeeStillPending.rows[0]?.total, '0');
      }

      if (!enforcementRequired) {
        const storedWithoutAutomaticAcceptance: QueryResult<{ total: string }> =
          await testClient.query<{ total: string }>(
            `SELECT COUNT(*)::text AS total
             FROM legal_acceptances
             WHERE user_id = $1 AND document_version = 'legal-e2e-v2'`,
            [actor.id],
          );
        assert.equal(storedWithoutAutomaticAcceptance.rows[0]?.total, '0');
        continue;
      }

      for (const document of pending.body.pending) {
        const accepted = await call(baseUrl, 'POST', '/legal/acceptances', {
          token: login.body.token,
          body: {
            documentType: document.documentType,
            documentVersion: document.version,
            origin: 'FLUTTER_APP',
          },
        });
        assert.equal(accepted.status, 201);
      }

      const duplicate = await call(baseUrl, 'POST', '/legal/acceptances', {
        token: login.body.token,
        body: {
          documentType: pending.body.pending[0]?.documentType,
          documentVersion: pending.body.pending[0]?.version,
          origin: 'FLUTTER_APP',
        },
      });
      assert.equal(duplicate.status, 201);

      const noPending = await call<{
        enforcementRequired: boolean;
        pending: PendingDocument[];
      }>(
        baseUrl,
        'GET',
        '/legal/documents/pending',
        { token: login.body.token },
      );
      assert.equal(noPending.status, 200);
      assert.equal(noPending.body.enforcementRequired, true);
      assert.equal(noPending.body.pending.length, 0);

      const current = await call<{ acceptances: unknown[] }>(
        baseUrl,
        'GET',
        '/legal/acceptances/current',
        { token: login.body.token },
      );
      assert.equal(current.status, 200);
      assert(
        actor.role === 'OWNER'
          ? current.body.acceptances.length === 3
          : current.body.acceptances.length === 2,
      );

      const allowed = await call(baseUrl, 'GET', actor.route, {
        token: login.body.token,
      });
      assert.equal(allowed.status, 200);

      const storedCurrent: QueryResult<{ total: string }> =
        await testClient.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM legal_acceptances
         WHERE user_id = $1 AND document_version = 'legal-e2e-v2'`,
        [actor.id],
      );
      assert.equal(storedCurrent.rows[0]?.total, '2');
    }

    console.log(JSON.stringify({
      ok: true,
      provider: 'postgres',
      temporaryDatabase: true,
      rolesChecked: ['ADMIN', 'OWNER', 'EMPLOYEE'],
      enforcementMode,
      enforcementRequired,
      pendingChecked: true,
      contentChecked: true,
      acceptanceChecked: true,
      idempotencyChecked: true,
      newVersionChecked: true,
      userIsolationChecked: true,
      noAutomaticAcceptanceChecked: !enforcementRequired,
    }));
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()));
    }
    if (testClient) await testClient.end();
    if (dataSource) await dataSource.close();
    if (temporaryDatabaseCreated) {
      await administrator.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [temporaryDatabase],
      );
      await administrator.query(`DROP DATABASE "${temporaryDatabase}"`);
    }
    await administrator.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
