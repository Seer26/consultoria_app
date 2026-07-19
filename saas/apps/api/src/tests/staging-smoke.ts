import assert from 'node:assert/strict';

type JsonObject = Record<string, unknown>;

const baseUrl = process.env.STAGING_API_URL?.trim().replace(/\/$/, '');
const expectedHost = process.env.STAGING_EXPECTED_HOST?.trim();
const confirmation = process.env.CONFIRM_STAGING_SMOKE?.trim();
const adminEmail = process.env.STAGING_ADMIN_EMAIL?.trim();
const adminPassword = process.env.STAGING_ADMIN_PASSWORD;
const ownerEmail = process.env.STAGING_OWNER_EMAIL?.trim();
const ownerPassword = process.env.STAGING_OWNER_PASSWORD;

if (!baseUrl || !expectedHost) {
  throw new Error('STAGING_API_URL_AND_EXPECTED_HOST_REQUIRED');
}
const parsedUrl = new URL(baseUrl);
if (
  parsedUrl.protocol !== 'https:' ||
  parsedUrl.host !== expectedHost ||
  !parsedUrl.hostname.toLowerCase().includes('staging') ||
  ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname)
) {
  throw new Error('STAGING_SMOKE_REJECTED_UNSAFE_OR_UNCONFIRMED_HOST');
}
if (confirmation !== 'I_UNDERSTAND_STAGING_ONLY') {
  throw new Error('STAGING_SMOKE_EXPLICIT_CONFIRMATION_REQUIRED');
}
if (!adminEmail || !adminPassword || !ownerEmail || !ownerPassword) {
  throw new Error('STAGING_SYNTHETIC_TEST_CREDENTIALS_REQUIRED');
}

async function request<T>(
  method: string,
  pathname: string,
  options: {
    token?: string;
    body?: JsonObject;
    expectedStatus?: number;
    pdf?: boolean;
  } = {},
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
    throw new Error(`${method} ${pathname} returned unexpected HTTP ${response.status}`);
  }
  if (options.pdf) {
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.length > 1000);
    assert.match(response.headers.get('content-type') ?? '', /application\/pdf/);
    return bytes as T;
  }
  return await response.json() as T;
}

interface LoginResponse {
  token: string;
}

const health = await request<{ status: string; environment: string }>('GET', '/health');
assert.equal(health.status, 'ok');
assert.equal(health.environment, 'staging');

const ready = await request<{ status: string }>('GET', '/ready');
assert(['ready', 'degraded'].includes(ready.status));

const admin = await request<LoginResponse>('POST', '/auth/login', {
  body: { email: adminEmail, password: adminPassword },
});
const owner = await request<LoginResponse>('POST', '/auth/login', {
  body: { email: ownerEmail, password: ownerPassword },
});

const pending = await request<{
  pending: Array<{ documentType: string; version: string }>;
}>('GET', '/legal/documents/pending', { token: owner.token });
for (const document of pending.pending) {
  await request('POST', '/legal/acceptances', {
    token: owner.token,
    expectedStatus: 201,
    body: {
      documentType: document.documentType,
      documentVersion: document.version,
      origin: 'API',
    },
  });
}

await request('GET', '/dashboard/company', { token: owner.token });
await request('GET', '/company/settings', { token: owner.token });
await request('GET', '/billing/current-plan', { token: owner.token });
await request('GET', '/operations/metrics', { token: admin.token });

const submission = await request<{ id: string }>('POST', '/research/submissions', {
  token: owner.token,
  expectedStatus: 201,
  body: {
    respondentRole: 'Responsavel de teste sintetico',
    department: 'Operacao de staging',
  },
});
await request('POST', `/research/submissions/${submission.id}/answers`, {
  token: owner.token,
  expectedStatus: 201,
  body: {
    question: 'Como esta a operacao sintetica do staging?',
    answer: 'Fluxo sintetico exclusivo para smoke controlado.',
    pillar: 'Processos',
    score: 60,
  },
});
await request('POST', `/research/submissions/${submission.id}/complete`, {
  token: owner.token,
  body: {},
});
await request(
  'POST',
  `/research/submissions/${submission.id}/generate-action-plan`,
  { token: owner.token },
);
await request('GET', `/reports/research/${submission.id}/executive`, {
  token: owner.token,
});
await request<Buffer>(
  'GET',
  `/reports/research/${submission.id}/executive/pdf`,
  { token: owner.token, pdf: true },
);

if (process.env.STAGING_TEST_PASSWORD_RECOVERY === 'true') {
  await request('POST', '/auth/password/forgot', {
    expectedStatus: 202,
    body: { email: ownerEmail },
  });
}

console.log(JSON.stringify({
  ok: true,
  environment: 'staging',
  health: true,
  readiness: ready.status,
  legalAcceptance: true,
  dashboard: true,
  research: true,
  actionPlan: true,
  report: true,
  pdf: true,
  currentPlan: true,
  companySettings: true,
  metrics: true,
  passwordRecoveryRequested:
    process.env.STAGING_TEST_PASSWORD_RECOVERY === 'true',
}));
