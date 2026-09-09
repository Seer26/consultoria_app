import assert from 'node:assert/strict';
import http from 'node:http';

import bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL?.trim()) throw new Error('POSTGRES_E2E_REQUIRES_DATABASE_URL');
process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'postgres-test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'sprint-315-postgres-test-secret-32-chars';
process.env.REQUIRE_LEGAL_ACCEPTANCE = 'false';
process.env.EMAIL_PROVIDER = 'console';
process.env.EMAIL_ALLOW_TEST_PROVIDER = 'true';
process.env.AI_MIN_QUESTIONS = '5';
process.env.AI_MAX_QUESTIONS = '10';
process.env.AI_MIN_PILLARS = '3';

type Json = Record<string, unknown>;
type Auth = { token: string; user: { id: string; role: string; companyId: string | null; department?: string; jobFunction?: string } };
const scenarios: string[] = [];
const passed = (name: string) => scenarios.push(name);
const hasOwn = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

async function call<T>(base: string, method: string, path: string, input: {
  token?: string; body?: Json; status?: number; pdf?: boolean;
} = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(input.body ? { 'Content-Type': 'application/json' } : {}),
      ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  const expected = input.status ?? 200;
  if (response.status !== expected) {
    throw new Error(`${method} ${path}: expected ${expected}, received ${response.status}: ${await response.text()}`);
  }
  if (input.pdf) return Buffer.from(await response.arrayBuffer()) as T;
  return await response.json() as T;
}

const password = 'SenhaSprint315!';
const profile = (name: string, email: string, department: string, jobFunction: string) =>
  ({ name, email, password, department, jobFunction });

const { runPostgresMigrations, getPostgresMigrationStatus } = await import('../database/migrate');
const { dataSource } = await import('../database/data-source');
await runPostgresMigrations();
const migrationStatus = await getPostgresMigrationStatus();
assert.equal(migrationStatus.available, 7);
assert.equal(migrationStatus.pending.length, 0);
passed('migration 001-007 pronta');

const now = new Date().toISOString();
await dataSource.execute(`
  INSERT INTO users (id, name, email, password_hash, role, company_id, status, auth_version, created_at, updated_at)
  VALUES (@id, @name, @email, @passwordHash, 'ADMIN', NULL, 'ACTIVE', 0, @now, @now)
`, { id: 'admin-315', name: 'Admin Sprint 315', email: 'admin.315@example.invalid', passwordHash: await bcrypt.hash(password, 10), now });

const { app } = await import('../app');
const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('SERVER_START_FAILED');
const base = `http://127.0.0.1:${address.port}`;

try {
  const admin = await call<Auth>(base, 'POST', '/auth/login', { body: { email: 'admin.315@example.invalid', password } });
  const onboard = async (suffix: string) => call<{ company: { id: string }; owner: { id: string } }>(base, 'POST', '/companies/onboarding', {
    token: admin.token, status: 201,
    body: { company: { name: `Empresa ${suffix}`, slug: `empresa-315-${suffix.toLowerCase()}` }, owner: { name: `Owner ${suffix}`, email: `owner.${suffix.toLowerCase()}@example.invalid`, password } },
  });
  const companyA = await onboard('A');
  const companyB = await onboard('B');
  const login = (email: string) => call<Auth>(base, 'POST', '/auth/login', { body: { email, password } });
  const ownerA = await login('owner.a@example.invalid');
  const ownerB = await login('owner.b@example.invalid');

  assert.deepEqual(await call<unknown[]>(base, 'GET', '/company/team', { token: ownerA.token }), []);
  passed('OWNER lista somente a propria equipe');
  await call(base, 'GET', '/company/team', { token: admin.token, status: 403 });
  passed('ADMIN nao usa endpoint OWNER');

  const createEmployee = (token: string, body: Json, status = 201) =>
    call<{ id: string; role: string; companyId: string; department: string; jobFunction: string }>(base, 'POST', '/company/team', { token, body, status });
  const a1 = await createEmployee(ownerA.token, profile('Employee A1', 'employee.a1@example.invalid', 'Financeiro', 'Analista Financeiro'));
  assert.equal(a1.role, 'EMPLOYEE');
  assert.equal(a1.companyId, companyA.company.id);
  passed('OWNER A cria EMPLOYEE A1');
  assert.equal(a1.department, 'Financeiro');
  assert.equal(a1.jobFunction, 'Analista Financeiro');
  passed('OWNER define departamento e funcao');
  const a2 = await createEmployee(ownerA.token, profile('Employee A2', 'employee.a2@example.invalid', 'Comercial', 'Vendedor'));
  const b1 = await createEmployee(ownerB.token, profile('Employee B1', 'employee.b1@example.invalid', 'RH', 'Analista RH'));

  await createEmployee(ownerA.token, { ...profile('Invalid Owner', 'invalid.owner@example.invalid', 'Direcao', 'Diretor'), role: 'OWNER' }, 400);
  passed('OWNER nao cria outro OWNER');
  await createEmployee(ownerA.token, { ...profile('Invalid Admin', 'invalid.admin@example.invalid', 'TI', 'Admin'), role: 'ADMIN' }, 400);
  passed('OWNER nao cria ADMIN');
  await call(base, 'PUT', `/company/team/${b1.id}`, { token: ownerA.token, status: 403, body: profile('Ataque', 'employee.b1@example.invalid', 'Ataque', 'Ataque') });
  passed('OWNER A nao altera Empresa B');

  const updatedA1 = await call<{ department: string; jobFunction: string }>(base, 'PUT', `/company/team/${a1.id}`, {
    token: ownerA.token,
    body: { name: 'Employee A1', email: 'employee.a1@example.invalid', department: 'Controladoria', jobFunction: 'Especialista Financeiro' },
  });
  assert.equal(updatedA1.department, 'Controladoria');
  assert.equal(updatedA1.jobFunction, 'Especialista Financeiro');
  passed('OWNER edita perfil do EMPLOYEE');

  await createEmployee(ownerA.token, profile('Employee A3', 'employee.a3@example.invalid', 'Operacoes', 'Analista'));
  await createEmployee(ownerA.token, profile('Employee A4', 'employee.a4@example.invalid', 'Operacoes', 'Analista'));
  await createEmployee(ownerA.token, profile('Employee A5', 'employee.a5@example.invalid', 'Operacoes', 'Analista'), 402);
  passed('OWNER respeita limite USER_SEATS');

  await call(base, 'PATCH', `/company/team/${a1.id}/status`, { token: ownerA.token, body: { status: 'INACTIVE' } });
  await call(base, 'POST', '/auth/login', { status: 403, body: { email: 'employee.a1@example.invalid', password } });
  await call(base, 'PATCH', `/company/team/${a1.id}/status`, { token: ownerA.token, body: { status: 'ACTIVE' } });
  passed('OWNER inativa e reativa EMPLOYEE');

  const employeeA1 = await login('employee.a1@example.invalid');
  const employeeA2 = await login('employee.a2@example.invalid');
  const employeeB1 = await login('employee.b1@example.invalid');
  assert.equal(employeeA1.user.department, 'Controladoria');
  assert.equal(employeeA1.user.jobFunction, 'Especialista Financeiro');
  passed('auth entrega perfil profissional sanitizado');
  await call(base, 'GET', '/company/team', { token: employeeA1.token, status: 403 });
  passed('EMPLOYEE nao acessa gestao de equipe');

  const submissionA1 = await call<{ id: string; respondentDepartment: string; respondentJobFunction: string }>(base, 'POST', '/research/submissions', {
    token: employeeA1.token, status: 201,
    body: { department: 'Forjado', respondentRole: 'Forjado' },
  });
  assert.equal(submissionA1.respondentDepartment, 'Controladoria');
  assert.equal(submissionA1.respondentJobFunction, 'Especialista Financeiro');
  passed('EMPLOYEE inicia sem escolher perfil e backend ignora payload');
  const snapshot = await dataSource.one<{ respondent_department: string; respondent_job_function: string }>(`
    SELECT respondent_department, respondent_job_function FROM diagnosis_submissions WHERE id = ?
  `, [submissionA1.id]);
  assert.deepEqual(snapshot, { respondent_department: 'Controladoria', respondent_job_function: 'Especialista Financeiro' });
  passed('snapshot profissional gravado');
  await call(base, 'PUT', `/company/team/${a1.id}`, { token: ownerA.token, body: { name: 'Employee A1', email: 'employee.a1@example.invalid', department: 'Tesouraria', jobFunction: 'Coordenador' } });
  const unchanged = await dataSource.one<{ respondent_department: string; respondent_job_function: string }>(`
    SELECT respondent_department, respondent_job_function FROM diagnosis_submissions WHERE id = ?
  `, [submissionA1.id]);
  assert.deepEqual(unchanged, snapshot);
  passed('mudanca de perfil nao altera snapshot antigo');

  await dataSource.execute(`
    INSERT INTO users (id, name, email, password_hash, role, company_id, status, auth_version, department, job_function, created_at, updated_at)
    VALUES ('legacy-incomplete', 'Legacy Incomplete', @email, @hash, 'EMPLOYEE', @companyId, 'ACTIVE', 0, NULL, NULL, @now, @now)
  `, { email: 'legacy.incomplete@example.invalid', hash: await bcrypt.hash(password, 10), companyId: companyB.company.id, now });
  const incomplete = await login('legacy.incomplete@example.invalid');
  await call(base, 'POST', '/research/submissions', { token: incomplete.token, status: 400, body: {} });
  passed('EMPLOYEE sem perfil nao inicia pesquisa');

  const rawMarker = 'RESPOSTA_PRIVADA_A1_315';
  const pillars = ['Financeiro', 'Processos', 'Pessoas/RH', 'Financeiro', 'Processos'];
  for (const [index, pillar] of pillars.entries()) {
    await call(base, 'POST', `/research/submissions/${submissionA1.id}/answers`, {
      token: employeeA1.token, status: 201,
      body: { question: `Pergunta privada ${index + 1}?`, answer: `${rawMarker}_${index + 1}`, pillar, score: 60 },
    });
  }

  class SpyProvider {
    readonly name = 'gemini' as const;
    calls = 0;
    input = '';
    decision = false;
    async generateNextQuestion(value: { input: string }) {
      this.calls += 1; this.input = value.input;
      return { question: 'Qual processo deve ser melhorado no proximo trimestre?', pillar: 'Processos', reason: 'Cobertura suficiente.', shouldContinue: this.decision };
    }
    async generateConsultingAnalysis() { throw new Error('NOT_USED'); }
  }
  const { AiQuestionService } = await import('../modules/ai-question/ai-question.service');
  const { ResearchRepository } = await import('../modules/research/research.repository');
  const spy = new SpyProvider();
  const ai = new AiQuestionService(spy, new ResearchRepository());
  const authA1 = { userId: employeeA1.user.id, role: 'EMPLOYEE' as const, companyId: companyA.company.id, authVersion: 0 };
  const adaptive = await ai.generateNextQuestion(authA1, submissionA1.id);
  assert(spy.input.includes('Controladoria') && spy.input.includes('Especialista Financeiro'));
  passed('IA recebe area e funcao do snapshot');
  assert(!spy.input.includes('Vendedor') && !spy.input.includes('Analista RH'));
  passed('IA nao recebe dados de outro funcionario');
  assert.equal(adaptive.shouldContinue, false);
  passed('shouldContinue=false apos minimo encerra');

  const submissionA2 = await call<{ id: string }>(base, 'POST', '/research/submissions', { token: employeeA2.token, status: 201, body: {} });
  for (let index = 0; index < 10; index += 1) {
    await call(base, 'POST', `/research/submissions/${submissionA2.id}/answers`, {
      token: employeeA2.token, status: 201,
      body: { question: `Pergunta limite ${index + 1}?`, answer: `Resposta limite ${index + 1}`, pillar: pillars[index % pillars.length], score: 50 },
    });
  }
  const callsBeforeMax = spy.calls;
  const maxResult = await ai.generateNextQuestion({ ...authA1, userId: employeeA2.user.id }, submissionA2.id);
  assert.equal(maxResult.shouldContinue, false);
  assert.equal(spy.calls, callsBeforeMax);
  passed('MAX_QUESTIONS encerra obrigatoriamente');
  await call(base, 'POST', `/research/submissions/${submissionA2.id}/answers`, {
    token: employeeA2.token, status: 400,
    body: { question: 'Pergunta 11?', answer: 'Nao deve salvar', pillar: 'Financeiro' },
  });
  passed('pergunta MAX+1 nao e salva nem solicitada');
  const completedA2 = await call<Json>(base, 'POST', `/research/submissions/${submissionA2.id}/complete`, { token: employeeA2.token, body: {} });
  assert.equal(completedA2.status, 'COMPLETED');
  assert.equal(completedA2.diagnosisStatus, 'AGUARDANDO_REVISAO');
  assert.equal(hasOwn(completedA2, 'overallScore'), false);
  assert.equal(hasOwn(completedA2, 'pillarScores'), false);
  assert.equal(hasOwn(completedA2, 'criticalPoints'), false);
  assert.equal(hasOwn(completedA2, 'opportunities'), false);
  assert.equal(hasOwn(completedA2, 'recommendations'), false);
  assert.equal(hasOwn(completedA2, 'nextSteps'), false);
  passed('EMPLOYEE conclui pesquisa sem receber diagnostico estrategico');
  const persistedA2 = await dataSource.one<{ overall_score: number }>(`
    SELECT overall_score FROM diagnosis_submissions WHERE id = ?
  `, [submissionA2.id]);
  assert.equal(Number(persistedA2?.overall_score), 50);
  passed('score continua deterministico e persistido');
  await call(base, 'POST', `/research/submissions/${submissionA2.id}/diagnosis/approve`, { token: employeeA2.token, status: 403 });
  passed('EMPLOYEE nao aprova diagnostico');
  await call(base, 'POST', `/research/submissions/${submissionA2.id}/diagnosis/publish`, { token: employeeA2.token, status: 403 });
  passed('EMPLOYEE nao publica diagnostico');
  await call(base, 'GET', `/reports/research/${submissionA2.id}/executive`, { token: ownerA.token, status: 403 });
  passed('OWNER nao acessa diagnostico nao publicado');
  const reviewedA2 = await call<Json>(base, 'PUT', `/research/submissions/${submissionA2.id}/diagnosis/review`, {
    token: admin.token,
    body: {
      summary: 'Resumo revisado pela consultoria.',
      recommendations: ['Recomendacao revisada pela consultoria.'],
      reviewNotes: 'Validado em teste automatizado.',
    },
  });
  assert.equal(reviewedA2.summary, 'Resumo revisado pela consultoria.');
  passed('ADMIN revisa diagnostico preliminar');
  await call(base, 'POST', `/research/submissions/${submissionA2.id}/diagnosis/approve`, { token: admin.token });
  passed('ADMIN aprova diagnostico');
  await call(base, 'POST', `/research/submissions/${submissionA2.id}/diagnosis/publish`, { token: admin.token });
  passed('ADMIN publica diagnostico');

  const ownerEmployeeView = await call<{ answers: unknown[]; status: string }>(base, 'GET', `/research/submissions/${submissionA1.id}`, { token: ownerA.token });
  assert.equal(ownerEmployeeView.answers.length, 0);
  passed('OWNER nao recebe respostas de EMPLOYEE');
  assert(!JSON.stringify(ownerEmployeeView).includes(rawMarker));
  passed('OWNER nao acessa transcript por ID direto');
  const report = await call<Json>(base, 'GET', `/reports/research/${submissionA2.id}/executive`, { token: ownerA.token });
  assert(!JSON.stringify(report).includes('Resposta limite'));
  passed('reports OWNER nao contem respostas brutas');
  const pdf = await call<Buffer>(base, 'GET', `/reports/research/${submissionA2.id}/executive/pdf`, { token: ownerA.token, pdf: true });
  assert(!pdf.toString('utf8').includes('Resposta limite'));
  passed('PDF OWNER nao contem respostas brutas');
  await call(base, 'GET', `/reports/research/${submissionA2.id}/executive`, { token: employeeA2.token, status: 403 });
  passed('EMPLOYEE nao acessa relatorio executivo');
  await call(base, 'GET', `/reports/research/${submissionA2.id}/executive/pdf`, { token: employeeA2.token, status: 403 });
  passed('EMPLOYEE nao acessa PDF executivo');
  await call(base, 'POST', `/research/submissions/${submissionA2.id}/generate-action-plan`, { token: employeeA2.token, status: 403 });
  passed('EMPLOYEE nao gera plano de acao');
  await call(base, 'POST', `/ai/research/${submissionA2.id}/analysis`, { token: employeeA2.token, status: 403, body: { retry: true } });
  passed('EMPLOYEE nao gera analise estrategica por IA');

  const ownerSubmission = await call<{ id: string }>(base, 'POST', '/research/submissions', { token: ownerA.token, status: 201, body: { respondentRole: 'Diretor', department: 'Direcao' } });
  await call(base, 'POST', `/research/submissions/${ownerSubmission.id}/answers`, { token: ownerA.token, status: 201, body: { question: 'Pergunta do owner?', answer: 'Resposta do owner', pillar: 'Estrategia' } });
  const ownerOwn = await call<{ answers: unknown[] }>(base, 'GET', `/research/submissions/${ownerSubmission.id}`, { token: ownerA.token });
  assert.equal(ownerOwn.answers.length, 1);
  passed('OWNER acessa as proprias respostas');
  const adminView = await call<{ answers: Array<{ answer: string }> }>(base, 'GET', `/research/submissions/${submissionA1.id}`, { token: admin.token });
  assert(adminView.answers.some((answer) => answer.answer.includes(rawMarker)));
  passed('ADMIN acessa respostas individuais');
  const employeeOwn = await call<Json & { answers: unknown[] }>(base, 'GET', `/research/submissions/${submissionA1.id}`, { token: employeeA1.token });
  assert.equal(employeeOwn.answers.length, 5);
  assert.equal(hasOwn(employeeOwn, 'overallScore'), false);
  assert.equal(hasOwn(employeeOwn, 'pillarScores'), false);
  passed('EMPLOYEE ve status proprio sem campos estrategicos');
  await call(base, 'GET', `/research/submissions/${submissionA1.id}`, { token: employeeA2.token, status: 403 });
  passed('EMPLOYEE acessa somente as proprias respostas');
  await call(base, 'GET', `/research/submissions/${submissionA1.id}`, { token: ownerB.token, status: 403 });
  await call(base, 'GET', `/research/submissions/${submissionA1.id}`, { token: employeeB1.token, status: 403 });
  passed('isolamento Empresa A/B preservado');

  assert.equal(scenarios.length, 43);
  console.log(JSON.stringify({ ok: true, scenarios: scenarios.length, names: scenarios, realProviderCalls: 0, temporaryPostgres: true }));
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await dataSource.close();
}
