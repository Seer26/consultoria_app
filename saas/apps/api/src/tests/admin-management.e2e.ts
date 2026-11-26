import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'test-admin-management-secret';
process.env.DATABASE_PATH = path.join(
  os.tmpdir(),
  `consultoria-admin-mgmt-${Date.now()}.sqlite`,
);
process.env.RUN_MIGRATIONS_ON_STARTUP = 'false';

const bcrypt = await import('bcrypt');
const { randomUUID } = await import('node:crypto');
const { app } = await import('../app');
const { database } = await import('../db/database');
const { getPasswordResetTokenForTest } = await import('../modules/auth/email.service');

const server = app.listen(0);
await new Promise<void>((resolve) => server.once('listening', () => resolve()));
const port = (server.address() as AddressInfo).port;
const baseUrl = `http://127.0.0.1:${port}`;

async function api(
  route: string,
  opts: { method?: string; token?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${baseUrl}${route}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

async function seedUser(params: {
  email: string;
  password: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  companyId?: string | null;
  grantAdminCreate?: boolean;
}) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const hash = await bcrypt.hash(params.password, 10);
  database
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at, status, auth_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0)`,
    )
    .run(id, params.role, params.email, hash, params.role, params.companyId ?? null, now, now);

  if (params.grantAdminCreate) {
    database
      .prepare(
        `INSERT INTO user_permissions (id, user_id, permission, granted_by_user_id, created_at)
         VALUES (?, ?, 'admin:create', NULL, ?)`,
      )
      .run(randomUUID(), id, now);
  }
  return id;
}

try {
  // Seed company + OWNER + EMPLOYEE + 2 ADMINs (1 with admin:create, 1 without)
  const companyId = randomUUID();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO companies (id, name, slug, status, created_at, updated_at)
       VALUES (?, 'Empresa Teste', 'empresa-teste', 'ACTIVE', ?, ?)`,
    )
    .run(companyId, now, now);

  await seedUser({ email: 'owner@empresa.test', password: 'StrongPassword#1', role: 'OWNER', companyId });
  await seedUser({ email: 'employee@empresa.test', password: 'StrongPassword#1', role: 'EMPLOYEE', companyId });
  const plainAdminId = await seedUser({
    email: 'plain-admin@consultoria.test',
    password: 'StrongPassword#1',
    role: 'ADMIN',
    grantAdminCreate: false,
  });
  const superAdminId = await seedUser({
    email: 'super-admin@consultoria.test',
    password: 'StrongPassword#1',
    role: 'ADMIN',
    grantAdminCreate: true,
  });

  // 1. Public /auth/register remains disabled
  const regRes = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Hacker', email: 'h@x.com', password: 'StrongPassword#1', role: 'ADMIN' },
  });
  assert.notEqual(regRes.status, 201);

  // 1b. Hosted reset-password page is served safely on API
  const pageRes = await fetch(`${baseUrl}/auth/reset-password?token=sample-token`);
  assert.equal(pageRes.status, 200);
  assert.match(pageRes.headers.get('content-type') ?? '', /text\/html/i);
  assert.equal(pageRes.headers.get('cache-control'), 'no-store');
  assert.match(pageRes.headers.get('content-security-policy') ?? '', /connect-src 'self'/);
  const pageHtml = await pageRes.text();
  assert.ok(!pageHtml.includes('sample-token'));

  // 2. Unauthenticated blocked
  assert.equal((await api('/admins')).status, 401);
  assert.equal((await api('/admins', { method: 'POST', body: { name: 'A', email: 'a@b.com' } })).status, 401);

  // 3. Login as OWNER, EMPLOYEE, plain ADMIN, super ADMIN
  const ownerLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@empresa.test', password: 'StrongPassword#1' },
  });
  const empLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'employee@empresa.test', password: 'StrongPassword#1' },
  });
  const plainAdminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'plain-admin@consultoria.test', password: 'StrongPassword#1' },
  });
  const superAdminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'super-admin@consultoria.test', password: 'StrongPassword#1' },
  });

  assert.deepEqual(plainAdminLogin.body.user.permissions, []);
  assert.deepEqual(superAdminLogin.body.user.permissions, ['admin:create']);

  // 4. OWNER, EMPLOYEE, and plain ADMIN without admin:create get 403
  for (const token of [ownerLogin.body.token, empLogin.body.token, plainAdminLogin.body.token]) {
    assert.equal((await api('/admins', { token })).status, 403);
    assert.equal(
      (await api('/admins', { method: 'POST', token, body: { name: 'X', email: 'x@y.com' } })).status,
      403,
    );
    assert.equal(
      (await api(`/admins/${plainAdminId}/status`, { method: 'PATCH', token, body: { status: 'INACTIVE' } })).status,
      403,
    );
    assert.equal(
      (await api(`/admins/${plainAdminId}/permissions`, { method: 'PUT', token, body: { grantAdminCreate: true } })).status,
      403,
    );
  }

  const superToken = superAdminLogin.body.token;

  // 5. /auth/me returns permissions
  const meRes = await api('/auth/me', { token: superToken });
  assert.equal(meRes.status, 200);
  assert.deepEqual(meRes.body.user.permissions, ['admin:create']);

  // 6. Create new ADMIN via invite mode (no password)
  const invitedRes = await api('/admins', {
    method: 'POST',
    token: superToken,
    body: { name: 'Cliente Admin', email: '  Cliente.Admin@Empresa.Test  ', grantAdminCreate: false },
  });
  assert.equal(invitedRes.status, 201);
  assert.equal(invitedRes.body.inviteSent, true);
  assert.equal(invitedRes.body.admin.email, 'cliente.admin@empresa.test');
  assert.equal(invitedRes.body.admin.role, 'ADMIN');
  assert.equal(invitedRes.body.admin.status, 'ACTIVE');
  assert.equal(invitedRes.body.admin.passwordHash, undefined);

  const inviteToken = getPasswordResetTokenForTest('cliente.admin@empresa.test');
  assert.ok(inviteToken && inviteToken.length > 10);

  // Set initial password via /auth/password/reset and login
  const resetRes = await api('/auth/password/reset', {
    method: 'POST',
    body: { token: inviteToken, newPassword: 'ClientStrongPassword#9' },
  });
  assert.equal(resetRes.status, 200);

  const invitedLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'cliente.admin@empresa.test', password: 'ClientStrongPassword#9' },
  });
  assert.equal(invitedLogin.status, 200);
  assert.equal(invitedLogin.body.user.role, 'ADMIN');

  // 7. Duplicate email rejected with 409
  const dupRes = await api('/admins', {
    method: 'POST',
    token: superToken,
    body: { name: 'Dup', email: 'CLIENTE.ADMIN@empresa.test' },
  });
  assert.equal(dupRes.status, 409);
  assert.equal(dupRes.body.error, 'EMAIL_ALREADY_IN_USE');

  // 8. Last authorized admin protection (cannot deactivate or revoke admin:create from sole authorized admin)
  const selfDeactivate = await api(`/admins/${superAdminId}/status`, {
    method: 'PATCH',
    token: superToken,
    body: { status: 'INACTIVE' },
  });
  assert.equal(selfDeactivate.status, 409);
  assert.equal(selfDeactivate.body.error, 'LAST_AUTHORIZED_ADMIN_PROTECTED');

  const selfRevoke = await api(`/admins/${superAdminId}/permissions`, {
    method: 'PUT',
    token: superToken,
    body: { grantAdminCreate: false },
  });
  assert.equal(selfRevoke.status, 409);
  assert.equal(selfRevoke.body.error, 'LAST_AUTHORIZED_ADMIN_PROTECTED');

  // 9. Grant admin:create to invited admin, verify access, then revoke and verify immediate 403
  const grantRes = await api(`/admins/${invitedRes.body.admin.id}/permissions`, {
    method: 'PUT',
    token: superToken,
    body: { grantAdminCreate: true },
  });
  assert.equal(grantRes.status, 200);
  assert.deepEqual(grantRes.body.permissions, ['admin:create']);

  assert.equal((await api('/admins', { token: invitedLogin.body.token })).status, 200);

  const revokeRes = await api(`/admins/${invitedRes.body.admin.id}/permissions`, {
    method: 'PUT',
    token: superToken,
    body: { grantAdminCreate: false },
  });
  assert.equal(revokeRes.status, 200);
  assert.deepEqual(revokeRes.body.permissions, []);
  assert.equal((await api('/admins', { token: invitedLogin.body.token })).status, 403);

  // 10. Deactivate invited admin -> immediately revokes session and blocks /users/:id/status bypass
  const bypassRes = await api(`/users/${invitedRes.body.admin.id}/status`, {
    method: 'PATCH',
    token: superToken,
    body: { status: 'INACTIVE' },
  });
  assert.equal(bypassRes.status, 400);

  const deactRes = await api(`/admins/${invitedRes.body.admin.id}/status`, {
    method: 'PATCH',
    token: superToken,
    body: { status: 'INACTIVE' },
  });
  assert.equal(deactRes.status, 200);
  assert.equal(deactRes.body.status, 'INACTIVE');
  assert.equal((await api('/auth/me', { token: invitedLogin.body.token })).status, 401);

  console.log('admin-management.e2e.ts: ALL ASSERTIONS PASSED');
} finally {
  server.close();
  database.close();
  if (fs.existsSync(process.env.DATABASE_PATH!)) {
    fs.unlinkSync(process.env.DATABASE_PATH!);
  }
}
