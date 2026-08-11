import assert from 'node:assert/strict';
import http from 'node:http';

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Client } from 'pg';

dotenv.config({ path: '.env.local', override: true });

const sourceDatabaseUrl = process.env.DATABASE_URL?.trim();
if (!sourceDatabaseUrl) {
  throw new Error('POSTGRES_CHANGE_PASSWORD_TEST_REQUIRES_DATABASE_URL');
}
if (new URL(sourceDatabaseUrl).pathname.replace(/^\//, '') !== 'consultoria_local') {
  throw new Error('POSTGRES_CHANGE_PASSWORD_TEST_REQUIRES_LOCAL_DATABASE');
}

const temporaryDatabase = 'consultoria_change_password_test';
if (!/^consultoria_[a-z_]+_test$/.test(temporaryDatabase)) {
  throw new Error('POSTGRES_CHANGE_PASSWORD_TEST_DATABASE_NAME_REJECTED');
}

function databaseUrl(baseUrl: string, databaseName: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

const administrationUrl = databaseUrl(sourceDatabaseUrl, 'postgres');
const targetDatabaseUrl = databaseUrl(sourceDatabaseUrl, temporaryDatabase);
const jwtSecret = 'change-password-e2e-secret-with-adequate-length';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.DATABASE_URL = targetDatabaseUrl;
process.env.JWT_SECRET = jwtSecret;
process.env.REQUIRE_LEGAL_ACCEPTANCE = 'false';

interface CallOptions {
  token?: string;
  body?: Record<string, unknown>;
}

async function call<T = Record<string, unknown>>(
  baseUrl: string,
  method: string,
  pathname: string,
  options: CallOptions = {},
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
      throw new Error('POSTGRES_CHANGE_PASSWORD_TEST_DATABASE_ALREADY_EXISTS');
    }
    await administrator.query(`CREATE DATABASE "${temporaryDatabase}"`);
    temporaryDatabaseCreated = true;

    const { runPostgresMigrations } = await import('../database/migrate');
    await runPostgresMigrations();

    testClient = new Client({ connectionString: targetDatabaseUrl });
    await testClient.connect();
    const now = new Date().toISOString();
    await testClient.query(
      `INSERT INTO companies (id, name, slug, status, created_at, updated_at)
       VALUES ('company-password', 'Empresa Senha Sintetica',
               'empresa-senha-sintetica', 'ACTIVE', $1, $1)`,
      [now],
    );

    const actors = [
      {
        id: 'admin-password', role: 'ADMIN', companyId: null,
        oldPassword: 'AdminAntiga123!', newPassword: 'AdminNova123!',
      },
      {
        id: 'owner-password', role: 'OWNER', companyId: 'company-password',
        oldPassword: 'OwnerAntiga123!', newPassword: 'OwnerNova123!',
      },
      {
        id: 'employee-password', role: 'EMPLOYEE', companyId: 'company-password',
        oldPassword: 'EmployeeAntiga123!', newPassword: 'EmployeeNova123!',
      },
    ] as const;

    for (const actor of actors) {
      const passwordHash = await bcrypt.hash(actor.oldPassword, 10);
      await testClient.query(
        `INSERT INTO users (
           id, name, email, password_hash, role, company_id,
           created_at, updated_at, status, auth_version
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'ACTIVE', 0)`,
        [
          actor.id,
          `Usuario ${actor.role}`,
          `${actor.role.toLowerCase()}.password@example.test`,
          passwordHash,
          actor.role,
          actor.companyId,
          now,
        ],
      );
    }
    await testClient.query(
      `INSERT INTO users (
         id, name, email, password_hash, role, company_id,
         created_at, updated_at, status, auth_version
       ) VALUES (
         'inactive-password', 'Usuario Inativo', 'inactive.password@example.test',
         $1, 'EMPLOYEE', 'company-password', $2, $2, 'INACTIVE', 0
       )`,
      [await bcrypt.hash('InativaAntiga123!', 10), now],
    );

    const { app } = await import('../app');
    const importedDataSource = await import('../database/data-source');
    dataSource = importedDataSource.dataSource;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const tokens = new Map<string, string>();
    const auditLines: string[] = [];
    const originalLog = console.log;
    console.log = (...values: unknown[]) => {
      auditLines.push(values.map(String).join(' '));
      originalLog(...values);
    };
    try {
      for (const actor of actors) {
        const login = await call<{ token: string }>(baseUrl, 'POST', '/auth/login', {
          body: {
            email: `${actor.role.toLowerCase()}.password@example.test`,
            password: actor.oldPassword,
          },
        });
        assert.equal(login.status, 200);
        tokens.set(actor.role, login.body.token);

        const changed = await call(baseUrl, 'PUT', '/auth/password', {
          token: login.body.token,
          body: {
            currentPassword: actor.oldPassword,
            newPassword: actor.newPassword,
          },
        });
        assert.equal(changed.status, 200);
        const serialized = JSON.stringify(changed.body);
        assert(!serialized.includes('password_hash'));
        assert(!serialized.includes(actor.oldPassword));
        assert(!serialized.includes(actor.newPassword));

        const currentSession = await call(baseUrl, 'GET', '/legal/documents/pending', {
          token: login.body.token,
        });
        assert.equal(currentSession.status, 200);

        const oldLogin = await call(baseUrl, 'POST', '/auth/login', {
          body: {
            email: `${actor.role.toLowerCase()}.password@example.test`,
            password: actor.oldPassword,
          },
        });
        assert.equal(oldLogin.status, 401);

        const newLogin = await call(baseUrl, 'POST', '/auth/login', {
          body: {
            email: `${actor.role.toLowerCase()}.password@example.test`,
            password: actor.newPassword,
          },
        });
        assert.equal(newLogin.status, 200);
      }
    } finally {
      console.log = originalLog;
    }

    assert(auditLines.some((line) => line.includes('audit.password_changed')));
    for (const actor of actors) {
      assert(!auditLines.some((line) => line.includes(actor.oldPassword)));
      assert(!auditLines.some((line) => line.includes(actor.newPassword)));
    }
    assert(!auditLines.some((line) => line.includes('password_hash')));

    const adminToken = tokens.get('ADMIN')!;
    const wrongCurrent = await call(baseUrl, 'PUT', '/auth/password', {
      token: adminToken,
      body: {
        currentPassword: 'SenhaAtualErrada123!',
        newPassword: 'OutraSenhaNova123!',
      },
    });
    assert.equal(wrongCurrent.status, 400);
    assert.equal((wrongCurrent.body as { error?: string }).error, 'CURRENT_PASSWORD_INVALID');

    const weak = await call(baseUrl, 'PUT', '/auth/password', {
      token: adminToken,
      body: { currentPassword: 'AdminNova123!', newPassword: '12345678' },
    });
    assert.equal(weak.status, 400);
    assert.equal((weak.body as { error?: string }).error, 'WEAK_PASSWORD');

    const unchanged = await call(baseUrl, 'PUT', '/auth/password', {
      token: adminToken,
      body: { currentPassword: 'AdminNova123!', newPassword: 'AdminNova123!' },
    });
    assert.equal(unchanged.status, 400);
    assert.equal((unchanged.body as { error?: string }).error, 'PASSWORD_UNCHANGED');

    const noAuthentication = await call(baseUrl, 'PUT', '/auth/password', {
      body: { currentPassword: 'Qualquer123!', newPassword: 'Outra123!' },
    });
    assert.equal(noAuthentication.status, 401);
    assert.equal((noAuthentication.body as { error?: string }).error, 'TOKEN_REQUIRED');

    const inactiveToken = jwt.sign({
      userId: 'inactive-password',
      role: 'EMPLOYEE',
      companyId: 'company-password',
      authVersion: 0,
    }, jwtSecret);
    const inactive = await call(baseUrl, 'PUT', '/auth/password', {
      token: inactiveToken,
      body: {
        currentPassword: 'InativaAntiga123!',
        newPassword: 'InativaNova123!',
      },
    });
    assert.equal(inactive.status, 401);
    assert.equal((inactive.body as { error?: string }).error, 'INACTIVE_USER');

    const employeeBefore = await testClient.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = 'employee-password'",
    );
    const ownerCrossChange = await call(baseUrl, 'PUT', '/auth/password', {
      token: tokens.get('OWNER')!,
      body: {
        userId: 'employee-password',
        currentPassword: 'OwnerNova123!',
        newPassword: 'OwnerFinal123!',
      },
    });
    assert.equal(ownerCrossChange.status, 200);
    const employeeAfter = await testClient.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = 'employee-password'",
    );
    assert.equal(
      employeeAfter.rows[0]?.password_hash,
      employeeBefore.rows[0]?.password_hash,
    );
    assert(await bcrypt.compare(
      'EmployeeNova123!',
      employeeAfter.rows[0]!.password_hash,
    ));

    console.log(JSON.stringify({
      ok: true,
      provider: 'postgres',
      temporaryDatabase: true,
      rolesChecked: ['ADMIN', 'OWNER', 'EMPLOYEE'],
      currentPasswordChecked: true,
      passwordPolicyChecked: true,
      unchangedPasswordChecked: true,
      inactiveUserChecked: true,
      authenticationChecked: true,
      selfOnlyChecked: true,
      oldPasswordRejected: true,
      newPasswordAccepted: true,
      currentSessionPreserved: true,
      responseSanitized: true,
      auditSanitized: true,
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
