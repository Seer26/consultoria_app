import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'consultoria-readiness-incomplete-secret';
process.env.DATABASE_URL = '';
process.env.DATABASE_PATH = './data/consultoria-e2e-readiness-incomplete.sqlite';
process.env.EMAIL_PROVIDER = 'none';
process.env.OPENAI_API_KEY = '';

const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH);
if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });

const { database } = await import('../db/database');
const { initDatabase } = await import('../database/init');
const { app } = await import('../app');
await initDatabase();

const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  const healthBody = await health.json() as {
    status: string;
    database: {
      status: string;
      provider: string;
      connectivity: string;
      schema: string;
    };
  };
  assert.equal(healthBody.status, 'ok');
  assert.equal(healthBody.database.status, 'ready');
  assert.equal(healthBody.database.provider, 'sqlite');
  assert.equal(healthBody.database.connectivity, 'connected');
  assert.equal(healthBody.database.schema, 'ready');

  const ready = await fetch(`${baseUrl}/ready`);
  assert.equal(ready.status, 503);
  const readyBody = await ready.json() as {
    status: string;
    checks: { email: { status: string } };
  };
  assert.equal(readyBody.status, 'not_ready');
  assert.equal(readyBody.checks.email.status, 'not_ready');
  const serialized = JSON.stringify(readyBody);
  assert.equal(serialized.includes(path.resolve(databasePath)), false);
  assert.equal(serialized.toLowerCase().includes('secret'), false);
  const serializedHealth = JSON.stringify(healthBody);
  assert.equal(serializedHealth.includes(path.resolve(databasePath)), false);
  assert.equal(serializedHealth.toLowerCase().includes('secret'), false);

  console.log(JSON.stringify({
    ok: true,
    healthRemainsLive: true,
    incompleteReadinessReturns503: true,
    readinessSecretsAndPathsHidden: true,
  }));
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
  database.close();
  if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });
}
