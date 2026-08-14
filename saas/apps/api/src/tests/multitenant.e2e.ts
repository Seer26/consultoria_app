import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import bcrypt from 'bcrypt';

process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'consultoria-e2e-multitenant-secret';
process.env.DATABASE_URL = '';
process.env.DATABASE_PATH = './data/consultoria-e2e-multitenant.sqlite';
process.env.AI_ENABLED = 'true';
process.env.AI_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'fake-key-blocked-before-provider-call';

type JsonValue = Record<string, unknown> | Array<unknown>;

interface AuthResponse {
  token: string;
  user: {
    id: string;
    companyId: string | null;
    role: string;
  };
}

interface OnboardingResponse {
  company: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
    role: string;
  };
}

interface SubmissionResponse {
  id: string;
  companyId?: string;
  status: string;
}

interface ActionPlanResponse {
  companyId: string;
  tasks: Array<{ id: string; companyId: string }>;
}

interface ActionPlanTaskResponse {
  id: string;
  companyId: string;
  priority: string;
  status: string;
  responsibleUserId: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  isDueSoon: boolean;
}

interface ActionPlanAssigneeResponse {
  id: string;
  companyId: string;
  name: string;
  jobRole: string;
  department: string;
}

interface CurrentPlanResponse {
  companyId: string;
  plan: {
    slug: string;
    limits: {
      users: number;
      researchSubmissionsMonthly: number;
      reportPdfsMonthly: number;
      activeActionTasks: number;
      aiQuestionsMonthly: number;
    };
  };
  usage: {
    users: { used: number; limit: number };
    researchSubmissionsMonthly: { used: number; limit: number };
    reportPdfsMonthly: { used: number; limit: number };
    activeActionTasks: { used: number; limit: number };
    aiQuestionsMonthly: { used: number; limit: number };
  };
}

interface PlanOptionResponse {
  slug: string;
  limits: {
    users: number;
    researchSubmissionsMonthly: number;
    reportPdfsMonthly: number;
    activeActionTasks: number;
    aiQuestionsMonthly: number;
  };
}

interface CompanySettingsResponse {
  id: string;
  name: string;
  sector: string | null;
  size: string | null;
  phone: string | null;
  responsibleName: string | null;
  notes: string | null;
}

interface SubscriptionPlanEventResponse {
  previousPlanName: string | null;
  newPlanName: string;
  actorUserEmail: string | null;
  origin: string;
  reason: string | null;
}

const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request<T>(
  baseUrl: string,
  method: string,
  pathname: string,
  options: {
    token?: string;
    body?: JsonValue;
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
    const payload = await response.text();
    throw new Error(
      `${method} ${pathname} returned ${response.status}, expected ${expectedStatus}: ${payload}`,
    );
  }

  if (options.pdf) {
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.length > 1000, `${method} ${pathname} returned an empty PDF`);
    assert(
      response.headers.get('content-type')?.includes('application/pdf'),
      `${method} ${pathname} did not return application/pdf`,
    );
    return bytes as T;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function expectStatus(
  baseUrl: string,
  method: string,
  pathname: string,
  status: number,
  options: { token?: string; body?: JsonValue } = {},
): Promise<void> {
  await request(baseUrl, method, pathname, {
    ...options,
    expectedStatus: status,
  });
}

async function bootstrapAdmin(database: typeof import('../db/database').database): Promise<void> {
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('SenhaBeta123', 10);

  database.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, company_id, created_at, updated_at, status
    ) VALUES (
      'admin-e2e', 'Admin E2E', 'admin.e2e@teste.com', @passwordHash,
      'ADMIN', NULL, @now, @now, 'ACTIVE'
    )
  `).run({ passwordHash, now });
}

async function login(baseUrl: string, email: string): Promise<AuthResponse> {
  return request<AuthResponse>(baseUrl, 'POST', '/auth/login', {
    body: { email, password: 'SenhaBeta123' },
  });
}

async function onboardCompany(
  baseUrl: string,
  adminToken: string,
  slug: string,
): Promise<OnboardingResponse> {
  return request<OnboardingResponse>(baseUrl, 'POST', '/companies/onboarding', {
    token: adminToken,
    expectedStatus: 201,
    body: {
      company: {
        name: `Empresa ${slug.toUpperCase()}`,
        slug,
      },
      owner: {
        name: `Owner ${slug.toUpperCase()}`,
        email: `owner.${slug}@teste.com`,
        password: 'SenhaBeta123',
      },
    },
  });
}

async function createEmployee(
  baseUrl: string,
  adminToken: string,
  companyId: string,
  slug: string,
): Promise<{ id: string }> {
  return request<{ id: string }>(baseUrl, 'POST', `/companies/${companyId}/users`, {
    token: adminToken,
    expectedStatus: 201,
    body: {
      name: `Employee ${slug.toUpperCase()}`,
      email: `employee.${slug}@teste.com`,
      password: 'SenhaBeta123',
      role: 'EMPLOYEE',
    },
  });
}

async function createCompletedResearch(
  baseUrl: string,
  ownerToken: string,
  pillar: string,
): Promise<{ submission: SubmissionResponse; actionPlan: ActionPlanResponse }> {
  const submission = await request<SubmissionResponse>(baseUrl, 'POST', '/research/submissions', {
    token: ownerToken,
    expectedStatus: 201,
    body: {
      respondentRole: 'Diretor',
      department: pillar,
    },
  });

  const answerPillars = [pillar, 'Pessoas', 'Processos', pillar, 'Pessoas'];
  for (const [index, answerPillar] of answerPillars.entries()) {
    await request(baseUrl, 'POST', `/research/submissions/${submission.id}/answers`, {
      token: ownerToken,
      expectedStatus: 201,
      body: {
        question: `Pergunta ${index + 1} sobre ${answerPillar}`,
        answer: `Existe rotina inicial em ${answerPillar}, mas ainda falta controle e previsibilidade.`,
        pillar: answerPillar,
        score: 45,
      },
    });
  }

  const completed = await request<SubmissionResponse>(
    baseUrl,
    'POST',
    `/research/submissions/${submission.id}/complete`,
    {
      token: ownerToken,
      body: {},
    },
  );
  assert(completed.status === 'COMPLETED', 'Research was not completed');

  const actionPlan = await request<ActionPlanResponse>(
    baseUrl,
    'POST',
    `/research/submissions/${submission.id}/generate-action-plan`,
    {
      token: ownerToken,
    },
  );
  assert(actionPlan.tasks.length > 0, 'Action plan was not generated');

  return { submission: completed, actionPlan };
}

async function main(): Promise<void> {
  if (fs.existsSync(databasePath)) {
    fs.rmSync(databasePath, { force: true });
  }

  const { database } = await import('../db/database');
  const { initDatabase } = await import('../database/init');
  const { app } = await import('../app');

  await initDatabase();
  await bootstrapAdmin(database);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string', 'Server did not start');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await expectStatus(baseUrl, 'POST', '/auth/register', 403, {
      body: {
        name: 'Public Admin',
        email: 'public.admin@teste.com',
        password: 'SenhaBeta123',
        role: 'ADMIN',
      },
    });
    await expectStatus(baseUrl, 'POST', '/ai-diagnosis', 410, {
      body: { answers: [] },
    });

    const admin = await login(baseUrl, 'admin.e2e@teste.com');
    assert(admin.user.role === 'ADMIN', 'Admin login failed');

    const companyA = await onboardCompany(baseUrl, admin.token, 'empresa-a');
    const companyB = await onboardCompany(baseUrl, admin.token, 'empresa-b');
    const createdEmployeeA = await createEmployee(
      baseUrl,
      admin.token,
      companyA.company.id,
      'empresa-a',
    );
    await createEmployee(baseUrl, admin.token, companyB.company.id, 'empresa-b');

    const ownerA = await login(baseUrl, 'owner.empresa-a@teste.com');
    const ownerB = await login(baseUrl, 'owner.empresa-b@teste.com');
    const employeeA = await login(baseUrl, 'employee.empresa-a@teste.com');

    assert(ownerA.user.companyId === companyA.company.id, 'Owner A company mismatch');
    assert(ownerB.user.companyId === companyB.company.id, 'Owner B company mismatch');
    assert(employeeA.user.companyId === companyA.company.id, 'Employee A company mismatch');
    assert(employeeA.user.id === createdEmployeeA.id, 'Employee A id mismatch');

    const initialOwnerDashboard = await request<{
      onboarding: { completedCount: number; items: Record<string, boolean> };
    }>(baseUrl, 'GET', '/dashboard/company', { token: ownerA.token });
    assert(
      initialOwnerDashboard.onboarding.completedCount === 1 &&
        initialOwnerDashboard.onboarding.items.team === true &&
        initialOwnerDashboard.onboarding.items.companyProfile === false &&
        initialOwnerDashboard.onboarding.items.firstResearch === false,
      'Owner onboarding should expose the real initial state',
    );

    await expectStatus(baseUrl, 'GET', '/strategy', 401);
    await expectStatus(baseUrl, 'GET', '/strategy', 400, { token: admin.token });
    await expectStatus(
      baseUrl,
      'GET',
      `/strategy?companyId=${companyB.company.id}`,
      403,
      { token: ownerA.token },
    );
    const profileA = await request<{ companyId: string; mission: string }>(
      baseUrl,
      'PUT',
      '/strategy/profile',
      {
        token: ownerA.token,
        body: {
          mission: 'Ajudar clientes a crescer com consistencia.',
          vision: 'Ser referencia nacional em consultoria empresarial.',
          values: 'Etica, clareza e resultado.',
        },
      },
    );
    assert(
      profileA.companyId === companyA.company.id && profileA.mission.length > 0,
      'Owner should update only the strategy profile of their own company',
    );
    const editedProfileA = await request<{ mission: string; vision: string }>(
      baseUrl,
      'PUT',
      '/strategy/profile',
      {
        token: ownerA.token,
        body: { mission: 'Transformar empresas com gestao clara.' },
      },
    );
    assert(
      editedProfileA.mission === 'Transformar empresas com gestao clara.' &&
        editedProfileA.vision === 'Ser referencia nacional em consultoria empresarial.',
      'Strategy profile should support safe partial editing',
    );
    const objectiveA = await request<{
      id: string;
      companyId: string;
      responsibleUserId: string | null;
    }>(baseUrl, 'POST', '/strategy/objectives', {
      token: ownerA.token,
      expectedStatus: 201,
      body: {
        title: 'Aumentar a previsibilidade de receita',
        description: 'Consolidar uma operacao comercial previsivel.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        responsibleUserId: employeeA.user.id,
        dueDate: new Date(Date.now() + 90 * 86_400_000).toISOString(),
        notes: 'Revisao mensal pela diretoria.',
      },
    });
    assert(
      objectiveA.companyId === companyA.company.id &&
        objectiveA.responsibleUserId === employeeA.user.id,
      'Objective should persist the tenant and active employee assignee',
    );
    const editedObjectiveA = await request<{ status: string; priority: string }>(
      baseUrl,
      'PUT',
      `/strategy/objectives/${objectiveA.id}`,
      {
        token: ownerA.token,
        body: {
          title: 'Aumentar a previsibilidade de receita',
          description: 'Consolidar uma operacao comercial previsivel.',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          responsibleUserId: employeeA.user.id,
          notes: 'Atualizado no ciclo mensal.',
        },
      },
    );
    assert(
      editedObjectiveA.status === 'IN_PROGRESS' &&
        editedObjectiveA.priority === 'CRITICAL',
      'Owner should edit objective status and priority',
    );
    await expectStatus(baseUrl, 'POST', '/strategy/objectives', 400, {
      token: ownerA.token,
      body: {
        title: 'Responsavel de outra empresa',
        responsibleUserId: ownerB.user.id,
      },
    });
    const goalA = await request<{ id: string; objectiveId: string; targetValue: number }>(
      baseUrl,
      'POST',
      `/strategy/objectives/${objectiveA.id}/goals`,
      {
        token: ownerA.token,
        expectedStatus: 201,
        body: {
          title: 'Atingir receita recorrente alvo',
          initialValue: 100000,
          targetValue: 180000,
          currentValue: 125000,
          unit: 'BRL',
          dueDate: new Date(Date.now() + 20 * 86_400_000).toISOString(),
          status: 'IN_PROGRESS',
        },
      },
    );
    assert(
      goalA.objectiveId === objectiveA.id && goalA.targetValue === 180000,
      'Goal should be linked to its objective with measurable values',
    );
    const updatedGoalA = await request<{ currentValue: number; status: string }>(
      baseUrl,
      'PUT',
      `/strategy/goals/${goalA.id}`,
      {
        token: ownerA.token,
        body: {
          title: 'Atingir receita recorrente alvo',
          initialValue: 100000,
          targetValue: 180000,
          currentValue: 140000,
          unit: 'BRL',
          status: 'IN_PROGRESS',
        },
      },
    );
    assert(
      updatedGoalA.currentValue === 140000 && updatedGoalA.status === 'IN_PROGRESS',
      'Owner should update strategic goal progress',
    );
    const swotA = await request<{ id: string; category: string }>(
      baseUrl,
      'POST',
      '/strategy/swot',
      {
        token: ownerA.token,
        expectedStatus: 201,
        body: {
          category: 'STRENGTH',
          title: 'Equipe experiente',
          description: 'Conhecimento profundo dos clientes.',
        },
      },
    );
    assert(swotA.category === 'STRENGTH', 'SWOT category should be persisted');
    await expectStatus(baseUrl, 'POST', '/strategy/swot', 400, {
      token: ownerA.token,
      body: { category: 'INVALID', title: 'Categoria invalida' },
    });
    const updatedSwotA = await request<{ category: string; title: string }>(
      baseUrl,
      'PUT',
      `/strategy/swot/${swotA.id}`,
      {
        token: ownerA.token,
        body: { category: 'OPPORTUNITY', title: 'Novo segmento de mercado' },
      },
    );
    assert(
      updatedSwotA.category === 'OPPORTUNITY',
      'Owner should update SWOT items',
    );
    await expectStatus(baseUrl, 'PUT', '/strategy/profile', 403, {
      token: employeeA.token,
      body: { mission: 'Nao permitido', vision: 'Nao permitido', values: 'Nao permitido' },
    });
    await expectStatus(baseUrl, 'POST', '/strategy/objectives', 403, {
      token: employeeA.token,
      body: { title: 'Nao permitido' },
    });
    const employeeStrategy = await request<{
      canEdit: boolean;
      companyId: string;
      objectives: Array<{ id: string }>;
    }>(baseUrl, 'GET', '/strategy', { token: employeeA.token });
    assert(
      !employeeStrategy.canEdit &&
        employeeStrategy.companyId === companyA.company.id &&
        employeeStrategy.objectives.some((item) => item.id === objectiveA.id),
      'Employee should have read-only access to their company strategy',
    );
    const adminStrategyA = await request<{ companyId: string }>(
      baseUrl,
      'GET',
      `/strategy?companyId=${companyA.company.id}`,
      { token: admin.token },
    );
    assert(
      adminStrategyA.companyId === companyA.company.id,
      'Admin should preserve explicit company-scoped strategy access',
    );
    const objectiveB = await request<{ id: string }>(
      baseUrl,
      'POST',
      '/strategy/objectives',
      {
        token: ownerB.token,
        expectedStatus: 201,
        body: { title: 'Objetivo privado da empresa B' },
      },
    );
    await expectStatus(baseUrl, 'PUT', `/strategy/objectives/${objectiveB.id}`, 403, {
      token: ownerA.token,
      body: { title: 'Tentativa de invasao' },
    });
    await expectStatus(baseUrl, 'DELETE', `/strategy/swot/${swotA.id}`, 403, {
      token: ownerB.token,
    });
    await request<void>(baseUrl, 'DELETE', `/strategy/swot/${swotA.id}`, {
      token: ownerA.token,
      expectedStatus: 204,
    });

    const updatedSettingsA = await request<CompanySettingsResponse>(
      baseUrl,
      'PUT',
      '/company/settings',
      {
        token: ownerA.token,
        body: {
          companyId: companyB.company.id,
          name: 'Empresa A Beta',
          sector: 'Servicos',
          size: '11-50',
          phone: '(11) 99999-0000',
          responsibleName: 'Responsavel A',
          notes: 'Preferencia por diagnostico mensal.',
        },
      },
    );
    assert(updatedSettingsA.id === companyA.company.id, 'Owner A settings should update own company');
    assert(updatedSettingsA.name === 'Empresa A Beta', 'Owner A settings name was not updated');
    assert(updatedSettingsA.sector === 'Servicos', 'Owner A settings sector was not updated');
    await expectStatus(baseUrl, 'GET', '/company/settings', 403, { token: employeeA.token });
    await expectStatus(baseUrl, 'PUT', '/company/settings', 403, {
      token: employeeA.token,
      body: { name: 'Employee should not edit' },
    });
    const ownerBSettings = await request<CompanySettingsResponse>(
      baseUrl,
      'GET',
      '/company/settings',
      { token: ownerB.token },
    );
    assert(ownerBSettings.id === companyB.company.id, 'Owner B should read only own company');
    assert(ownerBSettings.name !== 'Empresa A Beta', 'Owner A settings leaked into Company B');

    const researchA = await createCompletedResearch(baseUrl, ownerA.token, 'Financeiro');
    const researchB = await createCompletedResearch(baseUrl, ownerB.token, 'Comercial');
    const taskB = researchB.actionPlan.tasks[0];

    await expectStatus(baseUrl, 'POST', '/research/submissions', 403, {
      token: admin.token,
      body: {
        companyId: companyA.company.id,
        respondentRole: 'Admin',
        department: 'Financeiro',
      },
    });
    await expectStatus(
      baseUrl,
      'POST',
      `/research/submissions/${researchA.submission.id}/generate-action-plan`,
      403,
      { token: admin.token },
    );
    await expectStatus(baseUrl, 'POST', '/api/diagnosis/submissions', 410, {
      token: ownerA.token,
      body: { company: { name: 'Legacy' }, answers: [] },
    });

    await expectStatus(
      baseUrl,
      'GET',
      `/research/submissions?companyId=${companyB.company.id}`,
      403,
      { token: ownerA.token },
    );
    await expectStatus(baseUrl, 'GET', `/research/submissions/${researchB.submission.id}`, 403, {
      token: ownerA.token,
    });
    await expectStatus(baseUrl, 'GET', `/research/submissions/${researchB.submission.id}`, 403, {
      token: employeeA.token,
    });
    await expectStatus(
      baseUrl,
      'POST',
      `/research/submissions/${researchB.submission.id}/generate-action-plan`,
      403,
      { token: ownerA.token },
    );

    await expectStatus(
      baseUrl,
      'GET',
      `/action-plan/tasks?companyId=${companyB.company.id}`,
      403,
      { token: ownerA.token },
    );
    await expectStatus(baseUrl, 'GET', `/action-plan/tasks/${taskB.id}`, 403, {
      token: ownerA.token,
    });
    await expectStatus(baseUrl, 'GET', `/action-plan/tasks/${taskB.id}`, 403, {
      token: employeeA.token,
    });

    const assigneesA = await request<ActionPlanAssigneeResponse[]>(
      baseUrl,
      'GET',
      '/action-plan/assignees',
      { token: ownerA.token },
    );
    assert(
      assigneesA.length === 1 &&
        assigneesA.every((assignee) => assignee.companyId === companyA.company.id),
      'Owner A should list only active EMPLOYEE assignees from Company A',
    );
    const employeeAssigneesA = await request<ActionPlanAssigneeResponse[]>(
      baseUrl,
      'GET',
      '/action-plan/assignees',
      { token: employeeA.token },
    );
    assert(
      employeeAssigneesA.length === 1 &&
        employeeAssigneesA[0].id === employeeA.user.id,
      'Employee should never receive other assignees',
    );
    await expectStatus(
      baseUrl,
      'GET',
      `/action-plan/assignees?companyId=${companyB.company.id}`,
      403,
      { token: employeeA.token },
    );
    const inactivePasswordHash = await bcrypt.hash('Inactive!User2026', 10);
    database
      .prepare(
        `
        INSERT INTO users (
          id, name, email, password_hash, role, company_id,
          created_at, updated_at, status
        ) VALUES (
          'inactive-assignee-a', 'Inactive Assignee A',
          'inactive.assignee.a@teste.com', @passwordHash, 'EMPLOYEE',
          @companyId, @now, @now, 'INACTIVE'
        )
        `,
      )
      .run({
        passwordHash: inactivePasswordHash,
        companyId: companyA.company.id,
        now: new Date().toISOString(),
      });
    const activeAssigneesAfterInactive = await request<ActionPlanAssigneeResponse[]>(
      baseUrl,
      'GET',
      '/action-plan/assignees',
      { token: ownerA.token },
    );
    assert(
      !activeAssigneesAfterInactive.some(
        (assignee) => assignee.id === 'inactive-assignee-a',
      ),
      'Inactive user must not appear in assignee options',
    );
    await expectStatus(
      baseUrl,
      'GET',
      `/action-plan/assignees?companyId=${companyB.company.id}`,
      403,
      { token: ownerA.token },
    );

    const taskA = researchA.actionPlan.tasks[0];
    const anotherTaskA = researchA.actionPlan.tasks[1];
    await expectStatus(baseUrl, 'POST', '/action-plan/tasks', 403, {
      token: employeeA.token,
      body: { title: 'Colaborador não pode criar tarefa' },
    });
    await expectStatus(baseUrl, 'GET', `/action-plan/tasks/${anotherTaskA.id}`, 403, {
      token: employeeA.token,
    });
    await expectStatus(baseUrl, 'PUT', `/action-plan/tasks/${taskA.id}`, 400, {
      token: ownerA.token,
      body: {
        title: 'Tentativa com usuário de outra empresa',
        responsibleUserId: ownerB.user.id,
      },
    });
    await expectStatus(baseUrl, 'PUT', `/action-plan/tasks/${taskA.id}`, 409, {
      token: ownerA.token,
      body: {
        title: 'Tentativa com usuário inativo',
        responsibleUserId: 'inactive-assignee-a',
      },
    });
    await expectStatus(baseUrl, 'PUT', `/action-plan/tasks/${taskA.id}`, 400, {
      token: ownerA.token,
      body: {
        title: 'Tentativa com OWNER como responsável',
        responsibleUserId: ownerA.user.id,
      },
    });
    const overdueDate = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const editedTaskA = await request<ActionPlanTaskResponse>(
      baseUrl,
      'PUT',
      `/action-plan/tasks/${taskA.id}`,
      {
        token: ownerA.token,
        body: {
          title: 'Revisar fluxo de caixa semanal',
          description: 'Tarefa editada pelo E2E com todos os campos operacionais.',
          pillar: 'Financeiro',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          dueDate: overdueDate,
          responsibleUserId: employeeA.user.id,
        },
      },
    );
    assert(editedTaskA.priority === 'CRITICAL', 'Task priority edit failed');
    assert(
      editedTaskA.responsibleUserId === employeeA.user.id,
      'Task assignee edit failed',
    );
    assert(
      editedTaskA.isOverdue && editedTaskA.daysOverdue >= 3,
      'Task overdue calculation failed',
    );
    const overdueTasksA = await request<ActionPlanTaskResponse[]>(
      baseUrl,
      'GET',
      '/action-plan/tasks?scope=overdue',
      { token: ownerA.token },
    );
    assert(
      overdueTasksA.some((task) => task.id === taskA.id),
      'Overdue filter should include edited task',
    );
    const mineTasksA = await request<ActionPlanTaskResponse[]>(
      baseUrl,
      'GET',
      '/action-plan/tasks?scope=mine',
      { token: employeeA.token },
    );
    assert(
      mineTasksA.some((task) => task.id === taskA.id),
      'Mine filter should include task assigned to Employee A',
    );
    const employeeTasksA = await request<ActionPlanTaskResponse[]>(
      baseUrl,
      'GET',
      '/action-plan/tasks',
      { token: employeeA.token },
    );
    assert(
      employeeTasksA.length === 1 && employeeTasksA[0].id === taskA.id,
      'Employee A should list only tasks assigned to them',
    );
    await request<ActionPlanTaskResponse>(
      baseUrl,
      'GET',
      `/action-plan/tasks/${taskA.id}`,
      { token: employeeA.token },
    );
    await expectStatus(baseUrl, 'PUT', `/action-plan/tasks/${taskA.id}`, 403, {
      token: employeeA.token,
      body: { title: 'Alteração administrativa indevida' },
    });
    await expectStatus(baseUrl, 'PATCH', `/action-plan/tasks/${taskA.id}/status`, 403, {
      token: employeeA.token,
      body: { status: 'CANCELED' },
    });
    const completedByEmployee = await request<ActionPlanTaskResponse>(
      baseUrl,
      'PATCH',
      `/action-plan/tasks/${taskA.id}/status`,
      { token: employeeA.token, body: { status: 'DONE' } },
    );
    assert(completedByEmployee.status === 'DONE', 'Employee should complete assigned task');
    await expectStatus(baseUrl, 'PATCH', `/action-plan/tasks/${taskA.id}/status`, 403, {
      token: employeeA.token,
      body: { status: 'TODO' },
    });
    await request<ActionPlanTaskResponse>(
      baseUrl,
      'PUT',
      `/action-plan/tasks/${taskA.id}`,
      {
        token: ownerA.token,
        body: { status: 'IN_PROGRESS' },
      },
    );
    await request<ActionPlanTaskResponse>(
      baseUrl,
      'PUT',
      `/action-plan/tasks/${anotherTaskA.id}`,
      {
        token: ownerA.token,
        body: {
          status: 'TODO',
          responsibleUserId: employeeA.user.id,
        },
      },
    );
    const startedByEmployee = await request<ActionPlanTaskResponse>(
      baseUrl,
      'PATCH',
      `/action-plan/tasks/${anotherTaskA.id}/status`,
      { token: employeeA.token, body: { status: 'IN_PROGRESS' } },
    );
    assert(
      startedByEmployee.status === 'IN_PROGRESS',
      'Employee should start an assigned pending task',
    );

    await expectStatus(
      baseUrl,
      'GET',
      `/reports/research/${researchB.submission.id}/executive`,
      403,
      { token: ownerA.token },
    );
    await expectStatus(
      baseUrl,
      'GET',
      `/reports/research/${researchA.submission.id}/executive`,
      403,
      { token: employeeA.token },
    );
    const employeeReports = await request<Array<{ submissionId: string }>>(
      baseUrl,
      'GET',
      '/reports/research',
      { token: employeeA.token },
    );
    assert(
      employeeReports.length === 0,
      'Employee A must not list reports created by other company members',
    );
    await expectStatus(
      baseUrl,
      'GET',
      `/reports/research/${researchB.submission.id}/executive/pdf`,
      403,
      { token: ownerA.token },
    );

    const ownerReports = await request<Array<{ submissionId: string; companyId: string }>>(
      baseUrl,
      'GET',
      '/reports/research',
      { token: ownerA.token },
    );
    assert(ownerReports.length === 1, 'Owner A should see only one report');
    assert(ownerReports[0].companyId === companyA.company.id, 'Owner A report company mismatch');

    const adminReports = await request<Array<{ companyId: string }>>(
      baseUrl,
      'GET',
      '/reports/research',
      { token: admin.token },
    );
    assert(adminReports.length === 2, 'Admin should see both company reports');
    assert(
      adminReports.some((report) => report.companyId === companyA.company.id) &&
        adminReports.some((report) => report.companyId === companyB.company.id),
      'Admin global reports missing one company',
    );
    const adminResearchDetails = await request<SubmissionResponse>(
      baseUrl,
      'GET',
      `/research/submissions/${researchA.submission.id}`,
      { token: admin.token },
    );
    assert(
      adminResearchDetails.id === researchA.submission.id,
      'Admin should read research details without responding',
    );

    const ownerDashboard = await request<{
      company: { id: string };
      metrics: {
        overdueTasks: number;
        criticalOverdueTasks: number;
        dueSoonTasks: number;
      };
      overdueTasks: ActionPlanTaskResponse[];
      onboarding: {
        completedCount: number;
        totalCount: number;
        progress: number;
        isComplete: boolean;
        items: Record<string, boolean>;
      };
    }>(
      baseUrl,
      'GET',
      '/dashboard/company',
      { token: ownerA.token },
    );
    assert(ownerDashboard.company.id === companyA.company.id, 'Owner dashboard company mismatch');
    assert(
      ownerDashboard.onboarding.items.companyProfile === true &&
        ownerDashboard.onboarding.items.firstResearch === true &&
        ownerDashboard.onboarding.items.firstResult === true &&
        ownerDashboard.onboarding.items.firstActionPlan === true &&
        ownerDashboard.onboarding.items.professionalProfiles === false,
      'Owner onboarding should reflect the real partial company state',
    );
    await request(baseUrl, 'PUT', `/company/team/${employeeA.user.id}`, {
      token: ownerA.token,
      body: {
        name: 'Employee EMPRESA-A',
        email: 'employee.empresa-a@teste.com',
        department: 'Operações',
        jobFunction: 'Analista de operações',
      },
    });
    const completedOnboardingDashboard = await request<{
      onboarding: {
        completedCount: number;
        totalCount: number;
        progress: number;
        isComplete: boolean;
      };
    }>(baseUrl, 'GET', '/dashboard/company', { token: ownerA.token });
    assert(
      completedOnboardingDashboard.onboarding.isComplete &&
        completedOnboardingDashboard.onboarding.completedCount ===
          completedOnboardingDashboard.onboarding.totalCount &&
        completedOnboardingDashboard.onboarding.progress === 100,
      'Owner onboarding should become complete from persisted company data',
    );
    assert(
      ownerDashboard.metrics.overdueTasks >= 1 &&
        ownerDashboard.metrics.criticalOverdueTasks >= 1,
      'Owner dashboard should expose real overdue metrics',
    );
    assert(
      ownerDashboard.overdueTasks.some((task) => task.id === taskA.id),
      'Owner dashboard should list the overdue task',
    );

    await request(baseUrl, 'GET', '/dashboard/admin', { token: admin.token });
    await request(baseUrl, 'GET', '/dashboard/employee', { token: employeeA.token });

    const reportA = await request<{ company: { companyId: string } }>(
      baseUrl,
      'GET',
      `/reports/research/${researchA.submission.id}/executive`,
      { token: ownerA.token },
    );
    assert(reportA.company.companyId === companyA.company.id, 'Report A company mismatch');

    await request<Buffer>(
      baseUrl,
      'GET',
      `/reports/research/${researchA.submission.id}/executive/pdf`,
      {
        token: ownerA.token,
        pdf: true,
      },
    );

    const currentPlan = await request<CurrentPlanResponse>(
      baseUrl,
      'GET',
      '/billing/current-plan',
      { token: ownerA.token },
    );
    assert(currentPlan.companyId === companyA.company.id, 'Current plan company mismatch');
    assert(currentPlan.plan.slug === 'starter', 'Default plan should be starter');
    assert(currentPlan.usage.users.used === 2, 'Current plan should count active users');
    assert(
      currentPlan.usage.researchSubmissionsMonthly.used === 1,
      'Current plan should count company research submissions',
    );

    await expectStatus(baseUrl, 'GET', '/billing/current-plan', 400, {
      token: admin.token,
    });
    const adminCompanyPlan = await request<CurrentPlanResponse>(
      baseUrl,
      'GET',
      `/billing/current-plan?companyId=${companyA.company.id}`,
      { token: admin.token },
    );
    assert(adminCompanyPlan.companyId === companyA.company.id, 'Admin company plan mismatch');

    const planOptions = await request<PlanOptionResponse[]>(
      baseUrl,
      'GET',
      '/billing/admin/plans',
      { token: admin.token },
    );
    assert(
      planOptions.some((plan) => plan.slug === 'starter') &&
        planOptions.some((plan) => plan.slug === 'growth'),
      'Admin plans endpoint should return starter and growth',
    );
    await expectStatus(
      baseUrl,
      'GET',
      `/billing/admin/companies/${companyA.company.id}/current-plan`,
      403,
      { token: ownerA.token },
    );
    await expectStatus(
      baseUrl,
      'PUT',
      `/billing/admin/companies/${companyA.company.id}/plan`,
      403,
      { token: ownerA.token, body: { planSlug: 'growth' } },
    );
    await expectStatus(
      baseUrl,
      'PUT',
      `/billing/admin/companies/${companyA.company.id}/plan`,
      403,
      { token: employeeA.token, body: { planSlug: 'growth' } },
    );

    for (const index of [1, 2, 3]) {
      await request(baseUrl, 'POST', `/companies/${companyA.company.id}/users`, {
        token: admin.token,
        expectedStatus: 201,
        body: {
          name: `Extra User ${index}`,
          email: `extra.${index}.empresa-a@teste.com`,
          password: 'SenhaBeta123',
          role: 'EMPLOYEE',
        },
      });
    }

    const starterBlockedPlan = await request<CurrentPlanResponse>(
      baseUrl,
      'GET',
      `/billing/admin/companies/${companyA.company.id}/current-plan`,
      { token: admin.token },
    );
    assert(
      starterBlockedPlan.usage.users.used === starterBlockedPlan.usage.users.limit,
      'Company A should be at Starter user limit before upgrade',
    );
    await expectStatus(baseUrl, 'POST', `/companies/${companyA.company.id}/users`, 402, {
      token: admin.token,
      body: {
        name: 'Blocked User',
        email: 'blocked.empresa-a@teste.com',
        password: 'SenhaBeta123',
        role: 'EMPLOYEE',
      },
    });

    const upgradedPlan = await request<CurrentPlanResponse>(
      baseUrl,
      'PUT',
      `/billing/admin/companies/${companyA.company.id}/plan`,
      {
        token: admin.token,
        body: {
          planSlug: 'growth',
          reason: 'Upgrade beta manual validado no E2E',
        },
      },
    );
    assert(upgradedPlan.plan.slug === 'growth', 'Admin should change Company A to Growth');
    assert(
      upgradedPlan.plan.limits.users > starterBlockedPlan.plan.limits.users,
      'Growth user limit should be higher',
    );
    await request(baseUrl, 'POST', `/companies/${companyA.company.id}/users`, {
      token: admin.token,
      expectedStatus: 201,
      body: {
        name: 'Unblocked Growth User',
        email: 'growth.unblocked.empresa-a@teste.com',
        password: 'SenhaBeta123',
        role: 'EMPLOYEE',
      },
    });

    const planEvents = await request<SubscriptionPlanEventResponse[]>(
      baseUrl,
      'GET',
      `/billing/admin/companies/${companyA.company.id}/plan-events`,
      { token: admin.token },
    );
    assert(planEvents.length >= 1, 'Plan change should create a history event');
    assert(planEvents[0].newPlanName === 'Growth', 'Latest plan event should point to Growth');
    assert(planEvents[0].actorUserEmail === 'admin.e2e@teste.com', 'Plan event actor mismatch');
    assert(planEvents[0].origin === 'MANUAL_ADMIN', 'Plan event origin mismatch');
    assert(
      planEvents[0].reason === 'Upgrade beta manual validado no E2E',
      'Plan event reason mismatch',
    );

    const activeTasks = database.prepare(`
      SELECT COUNT(*) AS total
      FROM action_plan_tasks
      WHERE company_id = ?
        AND status NOT IN ('DONE', 'CANCELED')
    `).get(companyB.company.id) as { total: number };
    database.prepare(`
      UPDATE plans
      SET max_active_action_tasks = ?
      WHERE id = 'plan-starter'
    `).run(Number(activeTasks.total));
    await expectStatus(baseUrl, 'POST', '/action-plan/tasks', 402, {
      token: ownerB.token,
      body: {
        title: 'Tarefa bloqueada por limite',
        description: 'Validacao de limite de tarefas ativas.',
        priority: 'MEDIUM',
        status: 'TODO',
      },
    });

    const researchCount = database.prepare(`
      SELECT COUNT(*) AS total
      FROM diagnosis_submissions
      WHERE company_id = ?
        AND submission_type = 'RESEARCH'
    `).get(companyB.company.id) as { total: number };
    database.prepare(`
      UPDATE plans
      SET max_research_submissions_monthly = ?
      WHERE id = 'plan-starter'
    `).run(Number(researchCount.total));
    await expectStatus(baseUrl, 'POST', '/research/submissions', 402, {
      token: ownerB.token,
      body: {
        respondentRole: 'Diretor',
        department: 'Financeiro',
      },
    });

    const usagePeriod = new Date().toISOString().slice(0, 7);
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO usage_counters (id, company_id, feature, period, quantity, updated_at)
      VALUES ('pdf-limit-e2e', ?, 'REPORT_PDFS_MONTHLY', ?, 30, ?)
      ON CONFLICT(company_id, feature, period) DO UPDATE SET
        quantity = excluded.quantity,
        updated_at = excluded.updated_at
    `).run(companyB.company.id, usagePeriod, now);
    await expectStatus(
      baseUrl,
      'GET',
      `/reports/research/${researchB.submission.id}/executive/pdf`,
      402,
      { token: ownerB.token },
    );

    database.prepare(`
      INSERT INTO usage_counters (id, company_id, feature, period, quantity, updated_at)
      VALUES ('ai-limit-e2e', ?, 'AI_QUESTIONS_MONTHLY', ?, 100, ?)
      ON CONFLICT(company_id, feature, period) DO UPDATE SET
        quantity = excluded.quantity,
        updated_at = excluded.updated_at
    `).run(companyB.company.id, usagePeriod, now);
    database.prepare(`
      UPDATE diagnosis_submissions
      SET status = 'IN_PROGRESS'
      WHERE id = ?
    `).run(researchB.submission.id);
    await expectStatus(baseUrl, 'POST', '/ai/next-question', 402, {
      token: ownerB.token,
      body: {
        submissionId: researchB.submission.id,
      },
    });

    console.log(
      JSON.stringify({
        ok: true,
        seedDisabled: true,
        companiesCreated: 2,
        ownerIsolationChecked: true,
        employeeIsolationChecked: true,
        adminGlobalReadChecked: true,
        pdfGenerated: true,
        planEndpointChecked: true,
        planLimitsChecked: true,
        manualPlanChangeChecked: true,
        ownerCompanySettingsChecked: true,
        planHistoryChecked: true,
        reportEmployeeScopeChecked: true,
        taskEditingChecked: true,
        overdueFiltersChecked: true,
        activeAssigneesChecked: true,
      }),
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
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
