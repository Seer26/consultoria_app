import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import bcrypt from 'bcrypt';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'consultoria-light-load-local-secret';
process.env.DATABASE_PATH = './data/consultoria-light-load.sqlite';
process.env.EMAIL_PROVIDER = 'console';
process.env.ENABLE_INTERNAL_METRICS = 'true';
process.env.OPENAI_API_KEY = 'fake-key-for-readiness-only';

const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH);
if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });

const { database } = await import('../db/database');
const { initDatabase } = await import('../database/init');
const { app } = await import('../app');
await initDatabase();

const now = new Date().toISOString();
const passwordHash = await bcrypt.hash('SenhaBeta123', 10);
database.prepare(`
  INSERT INTO companies (id, name, slug, status, created_at, updated_at)
  VALUES ('company-light-load', 'Empresa Carga Leve', 'empresa-carga-leve', 'ACTIVE', ?, ?)
`).run(now, now);
database.prepare(`
  INSERT INTO users (
    id, name, email, password_hash, role, company_id,
    created_at, updated_at, status, auth_version
  ) VALUES
    ('admin-light-load', 'Admin Carga', 'admin.load@teste.com', ?, 'ADMIN', NULL, ?, ?, 'ACTIVE', 0),
    ('owner-light-load', 'Owner Carga', 'owner.load@teste.com', ?, 'OWNER', 'company-light-load', ?, ?, 'ACTIVE', 0)
`).run(passwordHash, now, now, passwordHash, now, now);

const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const baseUrl = `http://127.0.0.1:${address.port}`;

async function login(email: string): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'SenhaBeta123' }),
  });
  assert.equal(response.status, 200);
  return ((await response.json()) as { token: string }).token;
}

const adminToken = await login('admin.load@teste.com');
const ownerToken = await login('owner.load@teste.com');
const samples: number[] = [];
let failures = 0;

async function measured(pathname: string, token?: string): Promise<void> {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) failures += 1;
  } catch {
    failures += 1;
  } finally {
    samples.push(performance.now() - started);
  }
}

const scenarios = [
  () => measured('/health'),
  () => measured('/ready'),
  () => measured('/dashboard/company', ownerToken),
  () => measured('/reports/research', ownerToken),
  () => measured('/operations/metrics', adminToken),
];

try {
  for (let iteration = 0; iteration < 5; iteration += 1) {
    for (let offset = 0; offset < scenarios.length; offset += 2) {
      await Promise.all(scenarios.slice(offset, offset + 2).map((scenario) => scenario()));
    }
  }
  assert.equal(failures, 0);
  const ordered = [...samples].sort((a, b) => a - b);
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const p95 = ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.95) - 1)];
  console.log(JSON.stringify({
    ok: true,
    target: 'local-temporary',
    concurrency: 2,
    iterations: 5,
    requests: samples.length,
    failures,
    averageMs: Number(average.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    maxMs: Number(Math.max(...samples).toFixed(2)),
    generatedAiPdfEmail: false,
  }));
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
  database.close();
  if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });
}
