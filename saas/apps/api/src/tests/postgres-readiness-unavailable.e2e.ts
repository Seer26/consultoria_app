import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'postgres-unavailable-test';
process.env.DATABASE_URL =
  'postgres://invalid:invalid@127.0.0.1:1/consultoria_unavailable';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'consultoria-postgres-unavailable-test-secret';
process.env.EMAIL_PROVIDER = 'console';
process.env.OPENAI_API_KEY = '';

const { app } = await import('../app');
const { dataSource } = await import('../database/data-source');

const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') {
  throw new Error('POSTGRES_UNAVAILABLE_TEST_SERVER_START_FAILED');
}
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const health = await fetch(`${baseUrl}/health`);
  const healthBody = await health.json() as {
    status: string;
    database: {
      provider: string;
      connectivity: string;
      schema: string;
    };
  };
  if (health.status !== 503) throw new Error('HEALTH_MUST_FAIL_WITHOUT_POSTGRES');
  if (healthBody.status !== 'error') throw new Error('HEALTH_STATUS_MUST_BE_ERROR');
  if (healthBody.database.provider !== 'postgres') {
    throw new Error('HEALTH_PROVIDER_MUST_BE_POSTGRES');
  }
  if (healthBody.database.connectivity !== 'unavailable') {
    throw new Error('HEALTH_CONNECTIVITY_MUST_BE_UNAVAILABLE');
  }

  const ready = await fetch(`${baseUrl}/ready`);
  const readyBody = await ready.json() as {
    status: string;
    checks: { database: { connectivity: string } };
  };
  if (ready.status !== 503) throw new Error('READINESS_MUST_FAIL_WITHOUT_POSTGRES');
  if (readyBody.status !== 'not_ready') {
    throw new Error('READINESS_STATUS_MUST_BE_NOT_READY');
  }
  if (readyBody.checks.database.connectivity !== 'unavailable') {
    throw new Error('READINESS_DATABASE_MUST_BE_UNAVAILABLE');
  }

  const serialized = JSON.stringify({ healthBody, readyBody }).toLowerCase();
  for (const sensitive of ['invalid:invalid', '127.0.0.1:1', 'database_url']) {
    if (serialized.includes(sensitive)) {
      throw new Error('POSTGRES_CONFIGURATION_LEAKED_IN_HEALTH');
    }
  }

  console.log(JSON.stringify({
    ok: true,
    healthReturns503: true,
    readinessReturns503: true,
    configurationSanitized: true,
  }));
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );
  await dataSource.close();
}
