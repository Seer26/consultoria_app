import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import bcrypt from 'bcrypt';

process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'consultoria-security-e2e-secret';
process.env.DATABASE_URL = '';
process.env.DATABASE_PATH = './data/consultoria-e2e-security.sqlite';
process.env.EMAIL_PROVIDER = 'console';
process.env.AI_ENABLED = 'true';
process.env.AI_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = '';
process.env.TRUST_PROXY_HOPS = '1';
process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
process.env.LOGIN_RATE_LIMIT_MAX = '3';
process.env.PASSWORD_FORGOT_RATE_LIMIT_MAX = '10';
process.env.AI_RATE_LIMIT_WINDOW_MS = '60000';
process.env.AI_RATE_LIMIT_MAX = '1';
process.env.PDF_RATE_LIMIT_WINDOW_MS = '60000';
process.env.PDF_RATE_LIMIT_MAX = '1';

const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH);
const genericRecoveryMessage =
  'Se existir uma conta associada a este e-mail, enviaremos as instrucoes de recuperacao.';

interface ApiResponse<T = Record<string, unknown>> {
  status: number;
  body: T;
  headers: Headers;
}

async function call<T = Record<string, unknown>>(
  baseUrl: string,
  method: string,
  pathname: string,
  options: {
    token?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? await response.json() as T
    : ({ bytes: (await response.arrayBuffer()).byteLength } as T);
  return { status: response.status, body, headers: response.headers };
}

async function bootstrapAdmin(database: typeof import('../db/database').database): Promise<void> {
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('SenhaBeta123', 10);
  database.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, company_id,
      created_at, updated_at, status, auth_version
    ) VALUES (
      'admin-security', 'Admin Security', 'admin.security@teste.com', @passwordHash,
      'ADMIN', NULL, @now, @now, 'ACTIVE', 0
    )
  `).run({ passwordHash, now });
}

async function main(): Promise<void> {
  if (fs.existsSync(databasePath)) {
    fs.rmSync(databasePath, { force: true });
  }

  const { database } = await import('../db/database');
  const { initDatabase } = await import('../database/init');
  const { app } = await import('../app');
  const { getPasswordResetTokenForTest } = await import('../modules/auth/email.service');

  await initDatabase();
  await bootstrapAdmin(database);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const validRequestId = 'client-request-1234';
    const health = await call(baseUrl, 'GET', '/health', {
      headers: { 'X-Request-ID': validRequestId },
    });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('x-request-id'), validRequestId);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-frame-options'), 'DENY');
    assert.equal(health.headers.get('referrer-policy'), 'no-referrer');
    assert.match(health.headers.get('content-security-policy') ?? '', /default-src 'none'/);
    assert.equal(health.headers.has('x-powered-by'), false);

    const replacedRequestId = await call(baseUrl, 'GET', '/health', {
      headers: { 'X-Request-ID': 'bad' },
    });
    assert.notEqual(replacedRequestId.headers.get('x-request-id'), 'bad');
    assert.match(replacedRequestId.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/i);

    const adminLogin = await call<{ token: string }>(baseUrl, 'POST', '/auth/login', {
      body: { email: 'admin.security@teste.com', password: 'SenhaBeta123' },
    });
    assert.equal(adminLogin.status, 200);

    const weakOwner = await call(baseUrl, 'POST', '/companies/onboarding', {
      token: adminLogin.body.token,
      body: {
        company: { name: 'Empresa Fraca', slug: 'empresa-fraca' },
        owner: { name: 'Owner Fraco', email: 'owner.fraco@teste.com', password: '12345678' },
      },
    });
    assert.equal(weakOwner.status, 400);
    assert.equal((weakOwner.body as { error: string }).error, 'WEAK_PASSWORD');

    const onboarding = await call<{
      company: { id: string };
      owner: { id: string };
    }>(baseUrl, 'POST', '/companies/onboarding', {
      token: adminLogin.body.token,
      body: {
        company: { name: 'Empresa Segura', slug: 'empresa-segura' },
        owner: {
          name: 'Owner Seguro',
          email: 'owner.seguro@teste.com',
          password: 'SenhaBeta123',
        },
      },
    });
    assert.equal(onboarding.status, 201);

    const ownerLogin = await call<{ token: string; user: { companyId: string } }>(
      baseUrl,
      'POST',
      '/auth/login',
      { body: { email: 'owner.seguro@teste.com', password: 'SenhaBeta123' } },
    );
    assert.equal(ownerLogin.status, 200);
    const ownerToken = ownerLogin.body.token;
    const companyId = onboarding.body.company.id;
    const ownerId = onboarding.body.owner.id;

    const submission = await call<{ id: string }>(baseUrl, 'POST', '/research/submissions', {
      token: ownerToken,
      body: { respondentRole: 'Diretor', department: 'Financeiro' },
    });
    assert.equal(submission.status, 201);
    const pillars = ['Processos', 'Pessoas', 'Estrategia', 'Processos', 'Pessoas'];
    for (const [index, pillar] of pillars.entries()) {
      await call(baseUrl, 'POST', `/research/submissions/${submission.body.id}/answers`, {
        token: ownerToken,
        body: {
          question: `Pergunta de seguranca ${index + 1}`,
          answer: 'Existe uma rotina inicial com melhorias planejadas.',
          pillar,
          score: 60,
        },
      });
    }
    const completed = await call(baseUrl, 'POST', `/research/submissions/${submission.body.id}/complete`, {
      token: ownerToken,
      body: {},
    });
    assert.equal(completed.status, 200);

    const firstPdf = await call(baseUrl, 'GET', `/reports/research/${submission.body.id}/executive/pdf`, {
      token: ownerToken,
    });
    assert.equal(firstPdf.status, 200);
    const secondPdf = await call(baseUrl, 'GET', `/reports/research/${submission.body.id}/executive/pdf`, {
      token: ownerToken,
    });
    assert.equal(secondPdf.status, 429);

    database.prepare(`
      UPDATE diagnosis_submissions SET status = 'IN_PROGRESS' WHERE id = ?
    `).run(submission.body.id);

    const aiUsageBefore = database.prepare(`
      SELECT COALESCE(SUM(quantity), 0) AS total FROM usage_counters
      WHERE company_id = ? AND feature = 'AI_QUESTIONS_MONTHLY'
    `).get(companyId) as { total: number };
    const firstAi = await call(baseUrl, 'POST', '/ai/question/next', {
      token: ownerToken,
      body: { submissionId: submission.body.id },
    });
    assert.equal(firstAi.status, 200);
    const secondAi = await call(baseUrl, 'POST', '/ai/question/next', {
      token: ownerToken,
      body: { submissionId: submission.body.id },
    });
    assert.equal(secondAi.status, 429);
    const aiUsageAfter = database.prepare(`
      SELECT COALESCE(SUM(quantity), 0) AS total FROM usage_counters
      WHERE company_id = ? AND feature = 'AI_QUESTIONS_MONTHLY'
    `).get(companyId) as { total: number };
    assert.equal(Number(aiUsageAfter.total), Number(aiUsageBefore.total));

    database.prepare(`UPDATE users SET status = 'INACTIVE' WHERE id = ?`).run(ownerId);
    const inactiveUser = await call(baseUrl, 'GET', '/dashboard/company', { token: ownerToken });
    assert.equal(inactiveUser.status, 401);
    assert.equal((inactiveUser.body as { error: string }).error, 'INACTIVE_USER');
    database.prepare(`UPDATE users SET status = 'ACTIVE' WHERE id = ?`).run(ownerId);

    database.prepare(`UPDATE companies SET status = 'INACTIVE' WHERE id = ?`).run(companyId);
    const inactiveCompany = await call(baseUrl, 'GET', '/dashboard/company', { token: ownerToken });
    assert.equal(inactiveCompany.status, 401);
    assert.equal((inactiveCompany.body as { error: string }).error, 'INACTIVE_COMPANY');
    database.prepare(`UPDATE companies SET status = 'ACTIVE' WHERE id = ?`).run(companyId);

    database.prepare(`UPDATE users SET role = 'EMPLOYEE' WHERE id = ?`).run(ownerId);
    const changedRole = await call(baseUrl, 'GET', '/company/settings', { token: ownerToken });
    assert.equal(changedRole.status, 403);
    database.prepare(`UPDATE users SET role = 'OWNER' WHERE id = ?`).run(ownerId);

    database.prepare(`UPDATE users SET company_id = NULL WHERE id = ?`).run(ownerId);
    const invalidMembership = await call(baseUrl, 'GET', '/dashboard/company', { token: ownerToken });
    assert.equal(invalidMembership.status, 401);
    assert.equal((invalidMembership.body as { error: string }).error, 'INVALID_COMPANY_MEMBERSHIP');
    database.prepare(`UPDATE users SET company_id = ? WHERE id = ?`).run(companyId, ownerId);

    const existingRecovery = await call<{ message: string }>(
      baseUrl,
      'POST',
      '/auth/password/forgot',
      { body: { email: 'owner.seguro@teste.com' } },
    );
    const missingRecovery = await call<{ message: string }>(
      baseUrl,
      'POST',
      '/auth/password/forgot',
      { body: { email: 'inexistente@teste.com' } },
    );
    assert.equal(existingRecovery.status, 202);
    assert.equal(missingRecovery.status, 202);
    assert.equal(existingRecovery.body.message, genericRecoveryMessage);
    assert.equal(missingRecovery.body.message, genericRecoveryMessage);

    const invalidReset = await call(baseUrl, 'POST', '/auth/password/reset', {
      body: { token: 'token-invalido', newPassword: 'NovaSenha123' },
    });
    assert.equal(invalidReset.status, 400);

    const firstResetToken = getPasswordResetTokenForTest('owner.seguro@teste.com');
    assert(firstResetToken);
    const weakReset = await call(baseUrl, 'POST', '/auth/password/reset', {
      body: { token: firstResetToken, newPassword: '12345678' },
    });
    assert.equal(weakReset.status, 400);

    database.prepare(`
      UPDATE password_reset_tokens SET expires_at = ? WHERE token_hash = ?
    `).run(
      new Date(Date.now() - 60_000).toISOString(),
      createHash('sha256').update(firstResetToken).digest('hex'),
    );
    const expiredReset = await call(baseUrl, 'POST', '/auth/password/reset', {
      body: { token: firstResetToken, newPassword: 'NovaSenha123' },
    });
    assert.equal(expiredReset.status, 400);

    await call(baseUrl, 'POST', '/auth/password/forgot', {
      body: { email: 'owner.seguro@teste.com' },
    });
    const validResetToken = getPasswordResetTokenForTest('owner.seguro@teste.com');
    assert(validResetToken && validResetToken !== firstResetToken);
    const successfulReset = await call(baseUrl, 'POST', '/auth/password/reset', {
      body: {
        token: validResetToken,
        newPassword: 'NovaSenha123',
        companyId: 'empresa-que-nao-deve-ser-usada',
      },
    });
    assert.equal(successfulReset.status, 200);

    const reusedReset = await call(baseUrl, 'POST', '/auth/password/reset', {
      body: { token: validResetToken, newPassword: 'OutraSenha123' },
    });
    assert.equal(reusedReset.status, 400);
    const revokedSession = await call(baseUrl, 'GET', '/dashboard/company', { token: ownerToken });
    assert.equal(revokedSession.status, 401);
    assert.equal((revokedSession.body as { error: string }).error, 'SESSION_REVOKED');

    const oldPassword = await call(baseUrl, 'POST', '/auth/login', {
      body: { email: 'owner.seguro@teste.com', password: 'SenhaBeta123' },
      headers: { 'X-Forwarded-For': '203.0.113.20' },
    });
    assert.equal(oldPassword.status, 401);
    const newPassword = await call<{ user: { companyId: string } }>(baseUrl, 'POST', '/auth/login', {
      body: { email: 'owner.seguro@teste.com', password: 'NovaSenha123' },
      headers: { 'X-Forwarded-For': '203.0.113.21' },
    });
    assert.equal(newPassword.status, 200);
    assert.equal(newPassword.body.user.companyId, companyId);

    for (let index = 0; index < 3; index += 1) {
      const attempt = await call(baseUrl, 'POST', '/auth/login', {
        body: { email: 'nao-revelar@teste.com', password: 'SenhaIncorreta123' },
        headers: { 'X-Forwarded-For': '203.0.113.99' },
      });
      assert.equal(attempt.status, 401);
    }
    const blockedLogin = await call(baseUrl, 'POST', '/auth/login', {
      body: { email: 'nao-revelar@teste.com', password: 'SenhaIncorreta123' },
      headers: { 'X-Forwarded-For': '203.0.113.99' },
    });
    assert.equal(blockedLogin.status, 429);
    assert(blockedLogin.headers.get('retry-after'));

    const storedTokens = database.prepare(`
      SELECT token_hash, status, used_at FROM password_reset_tokens WHERE user_id = ?
    `).all(ownerId) as Array<{ token_hash: string; status: string; used_at: string | null }>;
    assert(storedTokens.length >= 2);
    assert(storedTokens.every((row) => ![firstResetToken, validResetToken].includes(row.token_hash)));
    assert(storedTokens.some((row) => row.status === 'USED' && row.used_at));

    console.log(JSON.stringify({
      ok: true,
      databasePath,
      headersChecked: true,
      requestIdChecked: true,
      rateLimitsChecked: ['login', 'ai', 'pdf'],
      activeUserAndCompanyChecked: true,
      roleAndMembershipRefreshChecked: true,
      passwordRecoveryChecked: true,
      oldSessionRevoked: true,
      multitenantResetBindingChecked: true,
    }));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    database.close();
    if (fs.existsSync(databasePath)) {
      fs.rmSync(databasePath, { force: true });
    }
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
