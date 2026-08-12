import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.DATABASE_URL = 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.OPENAI_API_KEY = 'test-key-never-sent';
process.env.AI_ENABLED = 'true';
process.env.AI_PROVIDER = 'openai';
process.env.AI_MODEL = 'gpt-test-model';

const { env } = await import('../config/env');
const { AiQuestionService } = await import('../modules/ai-question/ai-question.service');

const auth = { userId: 'owner-a', role: 'OWNER' as const, companyId: 'company-a', authVersion: 0 };
const baseSubmission = {
  id: 'submission-a', companyId: 'company-a', userId: 'owner-a', questionnaireId: 'chat-research',
  submissionType: 'RESEARCH' as const, respondentRole: 'Diretor', department: 'Financeiro',
  respondentDepartment: 'Financeiro', respondentJobFunction: 'Diretor',
  status: 'IN_PROGRESS' as const, overallScore: null, summary: null, criticalPoints: [],
  opportunities: [], recommendations: [], nextSteps: [], pillarScores: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null,
  aiAnalysis: null,
};
const answers = [{
  id: 'answer-a', submissionId: 'submission-a', questionId: 'q1',
  question: 'Como a empresa acompanha o caixa?', answer: 'Usamos uma planilha semanal.',
  pillar: 'Financeiro', value: null, score: null, createdAt: new Date().toISOString(),
}];

class FakeRepository {
  submission = { ...baseSubmission };
  answers = [...answers];
  saved: unknown = null;
  async findUserById(id: string) {
    if (id === 'missing') return null;
    const role = id.startsWith('admin') ? 'ADMIN' as const
      : id.startsWith('employee') ? 'EMPLOYEE' as const : 'OWNER' as const;
    return { id, name: 'Usuario', email: 'safe@example.test', role, companyId: role === 'ADMIN' ? null : id.endsWith('-b') ? 'company-b' : 'company-a', status: 'ACTIVE' as const, department: 'Financeiro', jobFunction: 'Analista' };
  }
  async findCompanyById(id: string) {
    return { id, name: 'Empresa', slug: 'empresa', status: 'ACTIVE' as const, sector: 'Servicos', size: 'SMALL' };
  }
  async findSubmissionById(id: string) { return id === this.submission.id ? this.submission : null; }
  async listAnswersBySubmissionId() { return this.answers; }
  async saveAiAnalysis(_id: string, analysis: unknown) { this.saved = analysis; }
}

class FakeEntitlements {
  used = 0;
  blocked = false;
  async assertCanUseFeature() { if (this.blocked) throw new Error('PLAN_LIMIT_REACHED'); }
  async recordUsage() { this.used += 1; }
}

class FakeProvider {
  readonly name = 'openai' as const;
  calls = 0;
  result: unknown = { question: 'Qual indicador financeiro orienta as decisoes mensais?', pillar: 'Financeiro', reason: 'Aprofundar governanca.', shouldContinue: true };
  error: Error | null = null;
  lastInput = '';
  async generateNextQuestion(input: { input: string }) {
    this.calls += 1;
    this.lastInput = input.input;
    if (this.error) throw this.error;
    return this.result;
  }
  async generateConsultingAnalysis(input: { input: string }) {
    return this.generateNextQuestion(input);
  }
}

function setup() {
  const repository = new FakeRepository();
  const entitlements = new FakeEntitlements();
  const provider = new FakeProvider();
  const service = new AiQuestionService(provider as never, repository as never, entitlements as never);
  return { repository, entitlements, provider, service };
}

{
  const { service, provider, entitlements } = setup();
  const result = await service.generateNextQuestion(auth, 'submission-a');
  assert.equal(result.source, 'openai');
  assert.equal(result.pillar, 'Financeiro');
  assert.equal(entitlements.used, 1);
  assert(!provider.lastInput.includes('company-b'));
}

{
  const { service, provider } = setup();
  provider.result = { question: 'Qual processo operacional merece maior atencao agora?', pillar: 'Processos', reason: 'Ampliar cobertura.', shouldContinue: false };
  assert.equal((await service.generateNextQuestion(auth, 'submission-a')).shouldContinue, true);
}

{
  const { service, provider, repository } = setup();
  repository.answers = Array.from({ length: 5 }, (_, index) => ({
    ...answers[0], id: `answer-${index}`, questionId: `q-${index}`,
    question: `Como funciona o processo numero ${index}?`,
    pillar: ['Financeiro', 'Processos', 'Pessoas/RH'][index % 3],
  }));
  provider.result = { question: 'Qual melhoria deve ser priorizada no proximo ciclo?', pillar: 'Estrategia', reason: 'Cobertura suficiente.', shouldContinue: false };
  assert.equal((await service.generateNextQuestion(auth, 'submission-a')).shouldContinue, false);
}

{
  const { service, provider, repository } = setup();
  repository.answers = Array.from({ length: 10 }, (_, index) => ({
    ...answers[0], id: `answer-${index}`, questionId: `q-${index}`,
    question: `Pergunta de limite ${index}?`, pillar: 'Processos',
  }));
  const result = await service.generateNextQuestion(auth, 'submission-a');
  assert.equal(result.shouldContinue, false);
  assert.equal(provider.calls, 0);
}

for (const invalid of [
  { bad: true },
  { question: answers[0].question, pillar: 'Financeiro', reason: 'Repete.', shouldContinue: true },
  { question: 'Qual e a senha do banco?', pillar: 'Processos', reason: 'Inseguro.', shouldContinue: true },
]) {
  const { service, provider, entitlements } = setup();
  provider.result = invalid;
  const result = await service.generateNextQuestion(auth, 'submission-a');
  assert.equal(result.source, 'fallback');
  assert.equal(entitlements.used, 0);
}

for (const code of ['AI_TIMEOUT', 'AI_RATE_LIMITED', 'AI_PROVIDER_UNAVAILABLE']) {
  const { service, provider, entitlements } = setup();
  provider.error = new Error(code);
  const result = await service.generateNextQuestion(auth, 'submission-a');
  assert.equal(result.source, 'fallback');
  assert.equal(entitlements.used, 0);
}

{
  const { service, provider } = setup();
  (env as { aiEnabled: boolean }).aiEnabled = false;
  assert.equal((await service.generateNextQuestion(auth, 'submission-a')).source, 'fallback');
  assert.equal(provider.calls, 0);
  (env as { aiEnabled: boolean }).aiEnabled = true;
  const originalKey = env.aiProviderKey;
  (env as { aiProviderKey: string }).aiProviderKey = '';
  assert.equal((await service.generateNextQuestion(auth, 'submission-a')).source, 'fallback');
  assert.equal(provider.calls, 0);
  (env as { aiProviderKey: string }).aiProviderKey = originalKey;
}

for (const selectedProvider of ['gemini', 'openai'] as const) {
  const { service, provider } = setup();
  const originalProvider = env.aiProvider;
  const originalKey = env.aiProviderKey;
  Object.assign(env, { aiProvider: selectedProvider, aiProviderKey: '' });
  assert.equal((await service.generateNextQuestion(auth, 'submission-a')).source, 'fallback');
  assert.equal(provider.calls, 0);
  Object.assign(env, { aiProvider: originalProvider, aiProviderKey: originalKey });
}

{
  const { service, provider, entitlements } = setup();
  const [first, second] = await Promise.all([
    service.generateNextQuestion(auth, 'submission-a'),
    service.generateNextQuestion(auth, 'submission-a'),
  ]);
  assert.deepEqual(first, second);
  assert.equal(provider.calls, 1);
  assert.equal(entitlements.used, 1);
}

{
  const { service, entitlements } = setup();
  entitlements.blocked = true;
  await assert.rejects(service.generateNextQuestion(auth, 'submission-a'), /PLAN_LIMIT_REACHED/);
}

{
  const { service } = setup();
  await assert.rejects(service.generateNextQuestion({ ...auth, userId: 'owner-b', companyId: 'company-b' }, 'submission-a'), /FORBIDDEN/);
  await assert.rejects(service.generateNextQuestion({ ...auth, userId: 'employee-b', role: 'EMPLOYEE', companyId: 'company-b' }, 'submission-a'), /FORBIDDEN/);
  await assert.rejects(service.generateNextQuestion({ ...auth, userId: 'admin-a', role: 'ADMIN', companyId: null }, 'submission-a'), /ADMIN_RESEARCH_READ_ONLY/);
}

const validAnalysis = {
  executiveSummary: 'A empresa possui base operacional e precisa fortalecer previsibilidade.',
  strengths: ['Rotina financeira semanal.'],
  attentionPoints: ['Indicadores ainda pouco formalizados.'],
  recommendations: [{ title: 'Formalizar indicadores', description: 'Definir painel e rito mensal.', priority: 'HIGH', pillar: 'Financeiro' }],
};

{
  const { service, repository, provider, entitlements } = setup();
  repository.submission = { ...repository.submission, status: 'COMPLETED', overallScore: 61.5, pillarScores: [{ pillar: 'Financeiro', score: 61.5, answersCount: 1, maturity: 'intermediate' }] } as never;
  provider.result = validAnalysis;
  const result = await service.generateAnalysis(auth, 'submission-a');
  assert.equal(result.executiveSummary, validAnalysis.executiveSummary);
  assert.equal(repository.submission.overallScore, 61.5);
  assert(repository.saved);
  assert.equal(entitlements.used, 1);
}

{
  const { service, repository, provider } = setup();
  repository.submission = { ...repository.submission, status: 'COMPLETED', overallScore: 70 } as never;
  provider.error = new Error('AI_TIMEOUT');
  await assert.rejects(service.generateAnalysis(auth, 'submission-a'), /AI_TIMEOUT/);
  provider.error = null;
  provider.result = validAnalysis;
  assert.equal((await service.generateAnalysis(auth, 'submission-a', true)).recommendations.length, 1);
}

{
  const logs: string[] = [];
  const original = console.log;
  console.log = (...values: unknown[]) => logs.push(values.map(String).join(' '));
  try {
    const { service, provider } = setup();
    provider.error = new Error('provider-secret-prompt-content');
    await service.generateNextQuestion(auth, 'submission-a');
  } finally {
    console.log = original;
  }
  assert(!logs.join(' ').includes('provider-secret-prompt-content'));
  assert(!logs.join(' ').includes('Usamos uma planilha semanal'));
  assert(!logs.join(' ').includes('test-key-never-sent'));
}

console.log(JSON.stringify({
  ok: true,
  validAdaptiveQuestion: true,
  structuredValidation: true,
  invalidAndRepeatedFallback: true,
  timeout429And500: true,
  missingKeyAndFlag: true,
  providerSpecificKeys: true,
  duplicateProtection: true,
  planLimit: true,
  tenantIsolation: true,
  deterministicScorePreserved: true,
  finalAnalysisAndRetry: true,
  sanitizedLogs: true,
  realProviderCalls: 0,
}));
