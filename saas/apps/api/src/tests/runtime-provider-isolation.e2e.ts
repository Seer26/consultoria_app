import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';

import { schemaStatements } from '../db/schema';

type Json = Record<string, unknown>;

interface AuthResponse {
  token: string;
  user: { id: string; role: string; companyId: string | null };
}

interface OnboardingResponse {
  company: { id: string };
  owner: { id: string };
}

interface CompanySettingsResponse {
  id: string;
  name: string;
}

interface RunningApi {
  child: ChildProcess;
  baseUrl: string;
  output: () => string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function reservePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert(address && typeof address !== 'string', 'RUNTIME_ISOLATION_PORT_RESERVATION_FAILED');
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );
  return address.port;
}

async function waitForApi(api: RunningApi): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastStatus: number | null = null;
  let lastDatabaseState = 'unknown';
  while (Date.now() < deadline) {
    if (api.child.exitCode !== null) {
      throw new Error('RUNTIME_ISOLATION_API_EXITED_EARLY');
    }
    try {
      const response = await fetch(`${api.baseUrl}/health`);
      lastStatus = response.status;
      const payload = await response.json() as {
        database?: { provider?: string; connectivity?: string };
      };
      lastDatabaseState = [
        payload.database?.provider ?? 'unknown',
        payload.database?.connectivity ?? 'unknown',
      ].join('-');
      if (response.status === 200) return;
    } catch {
      // The server has not started listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const listening = api.output().includes('API running');
  throw new Error(
    `RUNTIME_ISOLATION_API_START_TIMEOUT:${lastStatus ?? 'NO_RESPONSE'}:` +
    `${lastDatabaseState}:${listening ? 'LISTENING' : 'NOT_LISTENING'}`,
  );
}

async function startApi(cwd: string, environment: NodeJS.ProcessEnv): Promise<RunningApi> {
  const port = await reservePort();
  const serverFile = fileURLToPath(new URL('../server.ts', import.meta.url));
  const tsxLoader = import.meta.resolve('tsx');
  let output = '';
  const child = spawn(process.execPath, ['--import', tsxLoader, serverFile], {
    cwd,
    env: {
      ...environment,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const collect = (chunk: Buffer) => {
    output = `${output}${chunk.toString('utf8')}`.slice(-16_384);
  };
  child.stdout?.on('data', collect);
  child.stderr?.on('data', collect);
  const api = {
    child,
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => output,
  };
  try {
    await waitForApi(api);
    return api;
  } catch (error) {
    await stopApi(api);
    throw error;
  }
}

async function stopApi(api: RunningApi): Promise<void> {
  if (api.child.exitCode !== null) return;
  const exited = new Promise<boolean>((resolve) =>
    api.child.once('exit', () => resolve(true)),
  );
  api.child.kill('SIGTERM');
  const graceful = await Promise.race([
    exited,
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (!graceful && api.child.exitCode === null) {
    api.child.kill('SIGKILL');
    await exited;
  }
}

async function request<T>(
  baseUrl: string,
  method: string,
  pathname: string,
  options: { token?: string; body?: Json; expectedStatus?: number } = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const expectedStatus = options.expectedStatus ?? 200;
  if (response.status !== expectedStatus) {
    throw new Error(`${method} ${pathname} returned ${response.status}, expected ${expectedStatus}`);
  }
  return await response.json() as T;
}

async function databaseArtifacts(root: string): Promise<string[]> {
  const artifacts: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await fsPromises.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (/\.(?:sqlite|sqlite3|db)(?:-(?:wal|shm))?$/i.test(entry.name)) {
        artifacts.push(path.relative(root, fullPath));
      }
    }
  };
  await visit(root);
  return artifacts.sort();
}

function baseEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'test',
    APP_ENV: 'runtime-isolation-test',
    ENABLE_DEMO_SEED: 'false',
    JWT_SECRET: 'runtime-isolation-test-secret-with-32-characters',
    REQUIRE_LEGAL_ACCEPTANCE: 'false',
    EMAIL_PROVIDER: 'console',
    EMAIL_ALLOW_TEST_PROVIDER: 'true',
    OPENAI_API_KEY: 'fake-key-for-readiness-only',
    RUN_MIGRATIONS_ON_STARTUP: 'false',
  };
}

async function verifyPostgres(root: string, databaseUrl: string): Promise<void> {
  const cwd = path.join(root, 'postgres');
  await fsPromises.mkdir(cwd, { recursive: true });
  const migrationsSource = fileURLToPath(
    new URL('../database/migrations', import.meta.url),
  );
  await fsPromises.cp(
    migrationsSource,
    path.join(cwd, 'src', 'database', 'migrations'),
    { recursive: true },
  );
  const forbiddenDatabasePath = path.join(cwd, 'must-not-exist.sqlite');
  const api = await startApi(cwd, {
    ...baseEnvironment(),
    DATABASE_URL: databaseUrl,
    DATABASE_PATH: forbiddenDatabasePath,
  });
  try {
    const health = await request<{
      status: string;
      database: { provider: string; connectivity: string };
    }>(api.baseUrl, 'GET', '/health');
    const readiness = await request<{
      status: string;
      checks: { database: { provider: string; migrations: { pendingCount: number } } };
    }>(api.baseUrl, 'GET', '/ready');
    assert(health.status === 'ok', 'RUNTIME_ISOLATION_POSTGRES_HEALTH');
    assert(health.database.provider === 'postgres', 'RUNTIME_ISOLATION_POSTGRES_PROVIDER');
    assert(health.database.connectivity === 'connected', 'RUNTIME_ISOLATION_POSTGRES_CONNECTION');
    assert(readiness.status === 'ready', 'RUNTIME_ISOLATION_POSTGRES_READINESS');
    assert(readiness.checks.database.provider === 'postgres', 'RUNTIME_ISOLATION_READY_PROVIDER');
    assert(
      readiness.checks.database.migrations.pendingCount === 0,
      'RUNTIME_ISOLATION_PENDING_MIGRATIONS',
    );
  } finally {
    await stopApi(api);
  }
  const artifacts = await databaseArtifacts(cwd);
  assert(artifacts.length === 0, 'RUNTIME_ISOLATION_POSTGRES_CREATED_SQLITE');
  assert(!fs.existsSync(forbiddenDatabasePath), 'RUNTIME_ISOLATION_POSTGRES_OPENED_SQLITE');
}

async function seedSqlite(databasePath: string): Promise<void> {
  await fsPromises.mkdir(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('RuntimeIsolation123!', 10);
  try {
    database.pragma('foreign_keys = ON');
    for (const statement of schemaStatements) database.exec(statement);
    database.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, role, company_id,
        created_at, updated_at, status, auth_version
      ) VALUES (
        'runtime-isolation-admin', 'Runtime Isolation Admin',
        'runtime.isolation.admin@example.invalid', @passwordHash, 'ADMIN', NULL,
        @now, @now, 'ACTIVE', 0
      )
    `).run({ passwordHash, now });
  } finally {
    database.close();
  }
}

async function verifySqlite(root: string): Promise<void> {
  const cwd = path.join(root, 'sqlite');
  const databasePath = path.join(cwd, 'data', 'runtime-isolation.sqlite');
  await seedSqlite(databasePath);
  const environment = baseEnvironment();
  delete environment.DATABASE_URL;
  environment.DATABASE_PATH = databasePath;
  const api = await startApi(cwd, environment);
  try {
    const health = await request<{
      status: string;
      database: { provider: string; connectivity: string };
    }>(api.baseUrl, 'GET', '/health');
    assert(health.status === 'ok', 'RUNTIME_ISOLATION_SQLITE_HEALTH');
    assert(health.database.provider === 'sqlite', 'RUNTIME_ISOLATION_SQLITE_PROVIDER');
    assert(health.database.connectivity === 'connected', 'RUNTIME_ISOLATION_SQLITE_CONNECTION');

    const admin = await request<AuthResponse>(api.baseUrl, 'POST', '/auth/login', {
      body: {
        email: 'runtime.isolation.admin@example.invalid',
        password: 'RuntimeIsolation123!',
      },
    });
    assert(admin.user.role === 'ADMIN', 'RUNTIME_ISOLATION_SQLITE_LOGIN');

    const onboard = async (suffix: string) => request<OnboardingResponse>(
      api.baseUrl,
      'POST',
      '/companies/onboarding',
      {
        token: admin.token,
        expectedStatus: 201,
        body: {
          company: { name: `Runtime Isolation ${suffix}`, slug: `runtime-${suffix}` },
          owner: {
            name: `Runtime Owner ${suffix}`,
            email: `runtime.owner.${suffix}@example.invalid`,
            password: 'RuntimeIsolation123!',
          },
        },
      },
    );
    const companyA = await onboard('a');
    const companyB = await onboard('b');
    const ownerA = await request<AuthResponse>(api.baseUrl, 'POST', '/auth/login', {
      body: { email: 'runtime.owner.a@example.invalid', password: 'RuntimeIsolation123!' },
    });
    const ownerB = await request<AuthResponse>(api.baseUrl, 'POST', '/auth/login', {
      body: { email: 'runtime.owner.b@example.invalid', password: 'RuntimeIsolation123!' },
    });
    const settingsA = await request<CompanySettingsResponse>(
      api.baseUrl,
      'GET',
      '/company/settings',
      { token: ownerA.token },
    );
    const settingsB = await request<CompanySettingsResponse>(
      api.baseUrl,
      'GET',
      '/company/settings',
      { token: ownerB.token },
    );
    assert(settingsA.id === companyA.company.id, 'RUNTIME_ISOLATION_SQLITE_TENANT_A');
    assert(settingsB.id === companyB.company.id, 'RUNTIME_ISOLATION_SQLITE_TENANT_B');
    assert(settingsA.id !== settingsB.id, 'RUNTIME_ISOLATION_SQLITE_TENANT_LEAK');
  } finally {
    await stopApi(api);
  }
  assert(fs.existsSync(databasePath), 'RUNTIME_ISOLATION_SQLITE_NOT_INITIALIZED');
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('RUNTIME_ISOLATION_REQUIRES_DATABASE_URL');
  const root = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'consultoria-runtime-isolation-'));
  try {
    await verifyPostgres(root, databaseUrl);
    await verifySqlite(root);
    console.log(JSON.stringify({
      ok: true,
      suite: 'runtime-provider-isolation',
      postgresProvider: true,
      postgresHealthAndReadiness: true,
      postgresCreatedNoSqlite: true,
      sqliteInitialized: true,
      sqliteLogin: true,
      sqliteTenantIsolation: true,
    }));
  } finally {
    await fsPromises.rm(root, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    suite: 'runtime-provider-isolation',
    error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
  }));
  process.exitCode = 1;
});
