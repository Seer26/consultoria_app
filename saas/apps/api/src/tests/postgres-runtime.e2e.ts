import http from 'node:http';

import bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error('POSTGRES_E2E_REQUIRES_DATABASE_URL');
}

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'postgres-test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'consultoria-postgres-e2e-secret-with-32-characters';
process.env.REQUIRE_LEGAL_ACCEPTANCE = 'false';
process.env.EMAIL_PROVIDER = 'console';
process.env.EMAIL_ALLOW_TEST_PROVIDER = 'true';

type Json = Record<string, unknown>;

interface AuthResponse {
  token: string;
  user: { id: string; role: string; companyId: string | null };
}

interface OnboardingResponse {
  company: { id: string };
  owner: { id: string };
}

interface SubmissionResponse {
  id: string;
  companyId: string;
  status: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request<T>(
  baseUrl: string,
  method: string,
  pathname: string,
  options: {
    token?: string;
    body?: Json;
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
  const expected = options.expectedStatus ?? 200;
  if (response.status !== expected) {
    throw new Error(
      `${method} ${pathname} returned ${response.status}, expected ${expected}: ` +
      await response.text(),
    );
  }
  if (options.pdf) {
    const buffer = Buffer.from(await response.arrayBuffer());
    assert(buffer.length > 1_000, 'POSTGRES_E2E_PDF_EMPTY');
    return buffer as T;
  }
  return await response.json() as T;
}

async function main(): Promise<void> {
  const { runPostgresMigrations } = await import('../database/migrate');
  const { dataSource } = await import('../database/data-source');
  const { app } = await import('../app');

  await runPostgresMigrations();
  await dataSource.execute(`
    TRUNCATE TABLE
      legal_acceptances,
      password_reset_tokens,
      company_subscription_events,
      usage_counters,
      action_plan_tasks,
      action_tasks,
      diagnosis_answers,
      diagnosis_submissions,
      company_subscriptions,
      users,
      companies
    RESTART IDENTITY CASCADE
  `);

  const now = new Date().toISOString();
  const password = 'SenhaPostgres123!';
  await dataSource.execute(`
    INSERT INTO users (
      id, name, email, password_hash, role, company_id,
      created_at, updated_at, status, auth_version
    ) VALUES (
      @id, @name, @email, @passwordHash, 'ADMIN', NULL,
      @now, @now, 'ACTIVE', 0
    )
  `, {
    id: 'postgres-e2e-admin',
    name: 'Admin PostgreSQL E2E',
    email: 'admin.postgres.e2e@example.invalid',
    passwordHash: await bcrypt.hash(password, 10),
    now,
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('E2E_SERVER_START_FAILED');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const admin = await request<AuthResponse>(baseUrl, 'POST', '/auth/login', {
      body: {
        email: 'admin.postgres.e2e@example.invalid',
        password,
      },
    });
    const onboard = async (suffix: string) =>
      request<OnboardingResponse>(baseUrl, 'POST', '/companies/onboarding', {
        token: admin.token,
        expectedStatus: 201,
        body: {
          company: { name: `Empresa PostgreSQL ${suffix}`, slug: `postgres-${suffix}` },
          owner: {
            name: `Owner PostgreSQL ${suffix}`,
            email: `owner.postgres.${suffix}@example.invalid`,
            password,
          },
        },
      });
    const companyA = await onboard('a');
    const companyB = await onboard('b');

    const createEmployee = async (
      companyId: string,
      suffix: string,
    ) => request<{ id: string }>(
      baseUrl,
      'POST',
      `/companies/${companyId}/users`,
      {
        token: admin.token,
        expectedStatus: 201,
        body: {
          name: `Employee PostgreSQL ${suffix}`,
          email: `employee.postgres.${suffix}@example.invalid`,
          password,
          role: 'EMPLOYEE',
        },
      },
    );
    await createEmployee(companyA.company.id, 'a');
    await createEmployee(companyB.company.id, 'b');

    const loginOwner = async (suffix: string) =>
      request<AuthResponse>(baseUrl, 'POST', '/auth/login', {
        body: {
          email: `owner.postgres.${suffix}@example.invalid`,
          password,
        },
      });
    const ownerA = await loginOwner('a');
    const ownerB = await loginOwner('b');
    const loginEmployee = async (suffix: string) =>
      request<AuthResponse>(baseUrl, 'POST', '/auth/login', {
        body: {
          email: `employee.postgres.${suffix}@example.invalid`,
          password,
        },
      });
    const employeeA = await loginEmployee('a');
    const employeeB = await loginEmployee('b');

    await request(baseUrl, 'PUT', '/company/settings', {
      token: ownerA.token,
      body: {
        sector: 'Consultoria',
        size: 'SMALL',
        phone: '+55 11 0000-0000',
        responsibleName: 'Owner PostgreSQL A',
        notes: 'Configuração sintética PostgreSQL.',
      },
    });
    await request(baseUrl, 'GET', '/company/settings', {
      token: employeeA.token,
      expectedStatus: 403,
    });
    const starterPlan = await request<{ plan: { slug: string } }>(
      baseUrl,
      'GET',
      '/billing/current-plan',
      { token: ownerA.token },
    );
    assert(starterPlan.plan.slug === 'starter', 'POSTGRES_E2E_STARTER_PLAN');
    await request(
      baseUrl,
      'PUT',
      `/billing/admin/companies/${companyA.company.id}/plan`,
      {
        token: ownerA.token,
        expectedStatus: 403,
        body: { planSlug: 'growth' },
      },
    );
    const growthPlan = await request<{ plan: { slug: string } }>(
      baseUrl,
      'PUT',
      `/billing/admin/companies/${companyA.company.id}/plan`,
      {
        token: admin.token,
        body: {
          planSlug: 'growth',
          reason: 'PostgreSQL E2E synthetic upgrade',
        },
      },
    );
    assert(growthPlan.plan.slug === 'growth', 'POSTGRES_E2E_PLAN_CHANGE');
    const planEvents = await request<Array<{ origin: string }>>(
      baseUrl,
      'GET',
      `/billing/admin/companies/${companyA.company.id}/plan-events`,
      { token: admin.token },
    );
    assert(
      planEvents.some((event) => event.origin === 'MANUAL_ADMIN'),
      'POSTGRES_E2E_PLAN_EVENT',
    );

    const partialSubmission = await request<SubmissionResponse>(
      baseUrl,
      'POST',
      '/research/submissions',
      {
        token: employeeA.token,
        expectedStatus: 201,
        body: {
          respondentRole: 'Operação',
          department: 'Processos',
        },
      },
    );
    await request(
      baseUrl,
      'GET',
      `/research/submissions/${partialSubmission.id}`,
      { token: employeeA.token },
    );
    await request(
      baseUrl,
      'GET',
      `/research/submissions/${partialSubmission.id}`,
      { token: employeeB.token, expectedStatus: 403 },
    );

    const submission = await request<SubmissionResponse>(
      baseUrl,
      'POST',
      '/research/submissions',
      {
        token: ownerA.token,
        expectedStatus: 201,
        body: {
          respondentRole: 'Direcao',
          department: 'Estrategia',
        },
      },
    );
    assert(submission.companyId === companyA.company.id, 'POSTGRES_E2E_TENANT_CREATION');

    await request(baseUrl, 'POST', `/research/submissions/${submission.id}/answers`, {
      token: ownerA.token,
      expectedStatus: 201,
      body: {
        question: 'Como a empresa acompanha seus indicadores?',
        answer: 'Acompanhamento semanal estruturado.',
        pillar: 'Estrategia',
        score: 80,
      },
    });
    await request(baseUrl, 'POST', `/research/submissions/${submission.id}/complete`, {
      token: ownerA.token,
      body: {},
    });
    await request(
      baseUrl,
      'POST',
      `/research/submissions/${submission.id}/generate-action-plan`,
      { token: ownerA.token },
    );
    await request(baseUrl, 'GET', '/action-plan/tasks', { token: ownerA.token });
    await request(baseUrl, 'GET', '/action-plan/assignees', { token: ownerA.token });
    await request(baseUrl, 'GET', '/dashboard/company', { token: ownerA.token });
    await request(
      baseUrl,
      'GET',
      `/reports/research/${submission.id}/executive`,
      { token: ownerA.token },
    );
    await request(
      baseUrl,
      'GET',
      `/reports/research/${submission.id}/executive/pdf`,
      { token: ownerA.token, pdf: true },
    );

    await request(baseUrl, 'GET', `/research/submissions/${submission.id}`, {
      token: ownerB.token,
      expectedStatus: 403,
    });
    await request(baseUrl, 'GET', `/research/submissions/${submission.id}`, {
      token: employeeB.token,
      expectedStatus: 403,
    });
    await request(baseUrl, 'GET', `/research/submissions/${submission.id}`, {
      token: admin.token,
    });
    await request(baseUrl, 'POST', '/research/submissions', {
      token: admin.token,
      expectedStatus: 403,
      body: {
        companyId: companyA.company.id,
        respondentRole: 'Admin',
        department: 'Global',
      },
    });
    const health = await request<{ database: { provider: string } }>(
      baseUrl,
      'GET',
      '/health',
    );
    assert(health.database.provider === 'postgres', 'POSTGRES_E2E_HEALTH_PROVIDER');
    const readiness = await request<{
      status: string;
      checks: { database: { migrations: { pendingCount: number } } };
    }>(baseUrl, 'GET', '/ready');
    assert(readiness.status === 'ready', 'POSTGRES_E2E_READINESS');
    assert(
      readiness.checks.database.migrations.pendingCount === 0,
      'POSTGRES_E2E_PENDING_MIGRATIONS',
    );
    await request(baseUrl, 'POST', '/auth/password/forgot', {
      expectedStatus: 202,
      body: { email: 'owner.postgres.a@example.invalid' },
    });
    console.log(JSON.stringify({
      ok: true,
      suite: process.argv.includes('--smoke') ? 'postgres-smoke' : 'postgres-e2e',
      tenantIsolation: true,
      fullFlow: true,
      pdf: true,
      partialResume: true,
      plansAndSettings: true,
      passwordRecoveryRequest: true,
    }));
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
    await dataSource.close();
  }
}

void main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    suite: 'postgres-runtime',
    error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
  }));
  process.exitCode = 1;
});
