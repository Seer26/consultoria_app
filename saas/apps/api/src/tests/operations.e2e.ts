import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import bcrypt from 'bcrypt';

process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'consultoria-operations-e2e-secret';
process.env.DATABASE_PATH = './data/consultoria-e2e-operations.sqlite';
process.env.EMAIL_PROVIDER = 'console';
process.env.OPENAI_API_KEY = 'fake-key-for-readiness-only';
process.env.ENABLE_INTERNAL_METRICS = 'true';
process.env.REQUIRE_LEGAL_ACCEPTANCE = 'true';
process.env.TERMS_VERSION = 'beta-test-v1';
process.env.PRIVACY_VERSION = 'beta-test-v1';

const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH);

async function call<T>(baseUrl: string, method: string, pathname: string, options: {
  token?: string;
  body?: Record<string, unknown>;
} = {}): Promise<{ status: number; body: T }> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return { status: response.status, body: await response.json() as T };
}

async function main(): Promise<void> {
  if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });

  const { database } = await import('../db/database');
  const { initDatabase } = await import('../database/init');
  const { app } = await import('../app');
  const { HttpEmailService } = await import('../modules/auth/email.service');
  await initDatabase();

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('SenhaBeta123', 10);
  database.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at, status, auth_version)
    VALUES ('admin-ops', 'Admin Ops', 'admin.ops@teste.com', ?, 'ADMIN', NULL, ?, ?, 'ACTIVE', 0)
  `).run(passwordHash, now, now);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const health = await call<{
      status: string;
      environment: string;
      database: {
        status: string;
        provider: string;
        connectivity: string;
        schema: string;
        migrations: { status: string; pendingCount: number };
      };
    }>(baseUrl, 'GET', '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');
    assert.equal(health.body.database.status, 'ready');
    assert.equal(health.body.database.provider, 'sqlite');
    assert.equal(health.body.database.connectivity, 'connected');
    assert.equal(health.body.database.schema, 'ready');
    assert.equal(health.body.database.migrations.status, 'embedded');
    assert.equal(health.body.database.migrations.pendingCount, 0);

    const ready = await call<{ status: string; checks: Record<string, unknown> }>(baseUrl, 'GET', '/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.status, 'ready');

    const adminLogin = await call<{ token: string }>(baseUrl, 'POST', '/auth/login', {
      body: { email: 'admin.ops@teste.com', password: 'SenhaBeta123' },
    });
    assert.equal(adminLogin.status, 200);
    const adminPendingBeforeAcceptance = await call<{
      pending: Array<{
        documentType: string;
        version: string;
        title: string;
        content: string;
      }>;
    }>(baseUrl, 'GET', '/legal/documents/pending', {
      token: adminLogin.body.token,
    });
    assert.equal(adminPendingBeforeAcceptance.status, 200);
    assert.equal(adminPendingBeforeAcceptance.body.pending.length, 2);
    for (const document of adminPendingBeforeAcceptance.body.pending) {
      assert(document.title.length > 0);
      assert(document.content.length > 0);
      const accepted = await call(baseUrl, 'POST', '/legal/acceptances', {
        token: adminLogin.body.token,
        body: {
          documentType: document.documentType,
          documentVersion: document.version,
          origin: 'FLUTTER_APP',
        },
      });
      assert.equal(accepted.status, 201);
    }
    const onboarding = await call<{
      company: { id: string };
      owner: { id: string };
    }>(baseUrl, 'POST', '/companies/onboarding', {
      token: adminLogin.body.token,
      body: {
        company: { name: 'Empresa Operacional', slug: 'empresa-operacional' },
        owner: { name: 'Owner Ops', email: 'owner.ops@teste.com', password: 'SenhaBeta123' },
      },
    });
    assert.equal(onboarding.status, 201);
    database.prepare(`
      INSERT INTO legal_acceptances (
        id, user_id, company_id, document_type, document_version,
        accepted_at, ip_hash, request_id, origin
      ) VALUES (
        'old-terms-acceptance', ?, ?, 'TERMS_OF_USE', 'beta-old-v0',
        ?, 'old-ip-hash', 'old-request-id', 'API'
      )
    `).run(
      onboarding.body.owner.id,
      onboarding.body.company.id,
      new Date(Date.now() - 86_400_000).toISOString(),
    );
    const employeeCreated = await call(baseUrl, 'POST', `/companies/${onboarding.body.company.id}/users`, {
      token: adminLogin.body.token,
      body: {
        name: 'Employee Ops',
        email: 'employee.ops@teste.com',
        password: 'SenhaBeta123',
        role: 'EMPLOYEE',
      },
    });
    assert.equal(employeeCreated.status, 201);

    const ownerLogin = await call<{ token: string }>(baseUrl, 'POST', '/auth/login', {
      body: { email: 'owner.ops@teste.com', password: 'SenhaBeta123' },
    });
    assert.equal(ownerLogin.status, 200);
    const employeeLogin = await call<{ token: string }>(baseUrl, 'POST', '/auth/login', {
      body: { email: 'employee.ops@teste.com', password: 'SenhaBeta123' },
    });
    assert.equal(employeeLogin.status, 200);

    const blocked = await call<{ error: string }>(baseUrl, 'GET', '/dashboard/company', {
      token: ownerLogin.body.token,
    });
    assert.equal(blocked.status, 428);
    assert.equal(blocked.body.error, 'LEGAL_ACCEPTANCE_REQUIRED');

    const pending = await call<{ pending: Array<{ documentType: string; version: string }> }>(
      baseUrl, 'GET', '/legal/documents/pending', { token: ownerLogin.body.token },
    );
    assert.equal(pending.status, 200);
    assert.equal(pending.body.pending.length, 2);
    for (const document of pending.body.pending) {
      const accepted = await call(baseUrl, 'POST', '/legal/acceptances', {
        token: ownerLogin.body.token,
        body: {
          documentType: document.documentType,
          documentVersion: document.version,
          origin: 'FLUTTER_APP',
        },
      });
      assert.equal(accepted.status, 201);
    }
    const dashboard = await call(baseUrl, 'GET', '/dashboard/company', { token: ownerLogin.body.token });
    assert.equal(dashboard.status, 200);
    const storedOwnerAcceptances = database.prepare(`
      SELECT COUNT(*) AS total
      FROM legal_acceptances
      WHERE user_id = ?
        AND document_version = 'beta-test-v1'
        AND ip_hash IS NOT NULL
        AND request_id IS NOT NULL
    `).get(onboarding.body.owner.id) as { total: number };
    assert.equal(storedOwnerAcceptances.total, 2);

    const employeeBlocked = await call<{ error: string }>(
      baseUrl,
      'GET',
      '/dashboard/employee',
      { token: employeeLogin.body.token },
    );
    assert.equal(employeeBlocked.status, 428);
    const employeePending = await call<{
      pending: Array<{ documentType: string; version: string }>;
    }>(baseUrl, 'GET', '/legal/documents/pending', {
      token: employeeLogin.body.token,
    });
    assert.equal(employeePending.status, 200);
    assert.equal(employeePending.body.pending.length, 2);
    for (const document of employeePending.body.pending) {
      const accepted = await call(baseUrl, 'POST', '/legal/acceptances', {
        token: employeeLogin.body.token,
        body: {
          documentType: document.documentType,
          documentVersion: document.version,
          origin: 'FLUTTER_WEB',
        },
      });
      assert.equal(accepted.status, 201);
    }
    const employeeDashboard = await call(
      baseUrl,
      'GET',
      '/dashboard/employee',
      { token: employeeLogin.body.token },
    );
    assert.equal(employeeDashboard.status, 200);
    const adminPending = await call<{ pending: unknown[] }>(
      baseUrl,
      'GET',
      '/legal/documents/pending',
      { token: adminLogin.body.token },
    );
    assert.equal(adminPending.status, 200);
    assert.equal(adminPending.body.pending.length, 0);
    const recoveryWhileLegalRequired = await call(
      baseUrl,
      'POST',
      '/auth/password/forgot',
      { body: { email: 'owner.ops@teste.com' } },
    );
    assert.equal(recoveryWhileLegalRequired.status, 202);

    const ownerMetrics = await call(baseUrl, 'GET', '/operations/metrics', { token: ownerLogin.body.token });
    assert.equal(ownerMetrics.status, 403);
    const adminMetrics = await call<{ metrics: { requests: number } }>(
      baseUrl, 'GET', '/operations/metrics', { token: adminLogin.body.token },
    );
    assert.equal(adminMetrics.status, 200);
    assert(adminMetrics.body.metrics.requests > 0);

    let capturedBody = '';
    let capturedAuthorization = '';
    const email = new HttpEmailService({
      apiUrl: 'https://email-provider.test/send',
      apiKey: 'test-provider-key',
      from: 'no-reply@teste.com',
      appPublicUrl: 'https://app.teste.com',
      timeoutMs: 1000,
      authHeader: 'X-Api-Key',
      authScheme: '',
      fields: { from: 'sender', to: 'recipient', subject: 'title', html: 'html', text: 'text', messageId: 'messageId' },
    }, async (_input, init) => {
      capturedBody = String(init?.body ?? '');
      capturedAuthorization = String((init?.headers as Record<string, string>)['X-Api-Key']);
      return new Response(JSON.stringify({ messageId: 'fake-message-1' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    await email.sendPasswordReset({
      to: 'owner.ops@teste.com',
      token: 'token-apenas-do-provedor-falso',
      expiresInMinutes: 30,
      requestId: 'operations-e2e-request',
    });
    assert.equal(capturedAuthorization, 'test-provider-key');
    assert.match(capturedBody, /reset-password/);
    assert.match(capturedBody, /owner\.ops@teste\.com/);

    console.log(JSON.stringify({
      ok: true,
      healthChecked: true,
      readinessChecked: true,
      legalAcceptanceChecked: true,
      legalVersioningChecked: true,
      adminLegalAcceptanceChecked: true,
      employeeLegalAcceptanceChecked: true,
      legalAuditFieldsChecked: true,
      metricsAuthorizationChecked: true,
      fakeEmailProviderChecked: true,
    }));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    database.close();
    if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
