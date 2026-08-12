import assert from 'node:assert/strict';

import dotenv from 'dotenv';
import { Client } from 'pg';
import type { AiProviderInput } from '../modules/ai-question/ai-question.types';

dotenv.config({ path: '.env.local', override: true, quiet: true });
const sourceUrl = process.env.DATABASE_URL?.trim();
if (!sourceUrl || new URL(sourceUrl).pathname.replace(/^\//, '') !== 'consultoria_local') {
  throw new Error('AI_REAL_TEST_REQUIRES_LOCAL_POSTGRES');
}
if (!process.env.GEMINI_API_KEY?.trim()) {
  console.log(JSON.stringify({ ok: false, skipped: true, reason: 'GEMINI_API_KEY_NOT_CONFIGURED' }));
  process.exit(0);
}

const databaseName = 'consultoria_ai_gemini_test';
assert(/^consultoria_[a-z0-9_]+_test$/.test(databaseName));
const withDatabase = (name: string) => {
  const url = new URL(sourceUrl);
  url.pathname = `/${name}`;
  return url.toString();
};
const administrator = new Client({ connectionString: withDatabase('postgres') });
let applicationDataSource: { close(): Promise<void> } | null = null;
await administrator.connect();
const drop = async () => {
  await administrator.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [databaseName],
  );
  await administrator.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
};

try {
  await drop();
  await administrator.query(`CREATE DATABASE "${databaseName}"`);
  process.env.DATABASE_URL = withDatabase(databaseName);
  process.env.AI_ENABLED = 'true';
  process.env.AI_PROVIDER = 'gemini';
  process.env.AI_MODEL = 'gemini-3.5-flash-lite';
  process.env.NODE_ENV = 'test';
  process.env.APP_ENV = 'ai-real-test';

  const { env } = await import('../config/env');
  Object.assign(env, {
    databaseUrl: withDatabase(databaseName),
    aiEnabled: true,
    aiProvider: 'gemini',
    aiModel: 'gemini-3.5-flash-lite',
    aiProviderKey: process.env.GEMINI_API_KEY,
  });
  const { runPostgresMigrations } = await import('../database/migrate');
  await runPostgresMigrations();

  const database = new Client({ connectionString: withDatabase(databaseName) });
  await database.connect();
  const now = new Date().toISOString();
  await database.query(`
    INSERT INTO companies (id, name, slug, status, sector, size, created_at, updated_at)
    VALUES ('company-ai-gemini', 'Empresa Sintetica Gemini', 'empresa-ai-gemini',
      'ACTIVE', 'Servicos', 'SMALL', $1, $1)
  `, [now]);
  await database.query(`
    INSERT INTO users (id, name, email, password_hash, role, company_id,
      created_at, updated_at, status, auth_version)
    VALUES ('owner-ai-gemini', 'Owner Sintetico', 'owner.gemini@example.test',
      'not-used', 'OWNER', 'company-ai-gemini', $1, $1, 'ACTIVE', 0)
  `, [now]);
  await database.query(`
    INSERT INTO diagnosis_submissions (
      id, company_id, user_id, submission_type, questionnaire_id, respondent_role,
      department, status, created_at, updated_at
    ) VALUES (
      'submission-ai-gemini', 'company-ai-gemini', 'owner-ai-gemini', 'RESEARCH',
      'chat-research', 'Diretor', 'Financeiro', 'IN_PROGRESS', $1, $1
    )
  `, [now]);
  await database.query(`
    INSERT INTO diagnosis_answers (
      id, submission_id, question_id, question, answer, pillar, value, score, created_at
    ) VALUES (
      'answer-ai-gemini', 'submission-ai-gemini', 'q1',
      'Como a empresa acompanha o fluxo de caixa?',
      'A empresa usa uma planilha semanal e revisa recebimentos toda sexta-feira.',
      'Financeiro', 60, 60, $1
    )
  `, [now]);
  await database.end();

  const { GeminiProvider } = await import('../modules/ai-question/ai-question.client');
  const { AiQuestionService } = await import('../modules/ai-question/ai-question.service');
  applicationDataSource = (await import('../database/data-source')).dataSource;
  const realProvider = new GeminiProvider();
  let calls = 0;
  let lastError: string | null = null;
  const observedProvider = {
    name: 'gemini' as const,
    async generateNextQuestion(input: AiProviderInput) {
      calls += 1;
      try { return await realProvider.generateNextQuestion(input); }
      catch (error) { lastError = error instanceof Error ? error.message : 'AI_PROVIDER_UNAVAILABLE'; throw error; }
    },
    async generateConsultingAnalysis(input: AiProviderInput) {
      calls += 1;
      try { return await realProvider.generateConsultingAnalysis(input); }
      catch (error) { lastError = error instanceof Error ? error.message : 'AI_PROVIDER_UNAVAILABLE'; throw error; }
    },
  };
  const service = new AiQuestionService(observedProvider);
  const auth = {
    userId: 'owner-ai-gemini', role: 'OWNER' as const,
    companyId: 'company-ai-gemini', authVersion: 0,
  };
  const question = await service.generateNextQuestion(auth, 'submission-ai-gemini');
  if (question.source !== 'gemini') {
    console.log(JSON.stringify({
      ok: false, stopped: true, reason: lastError ?? 'AI_REAL_RESPONSE_UNAVAILABLE',
      provider: 'gemini', api: 'openai-compatible-chat-completions',
      model: env.aiModel, calls, adaptiveQuestionValid: false,
      consultingAnalysisValid: false, temporaryPostgres: true,
    }));
  } else {
    assert(question.question.length >= 8);
    assert(question.pillar.length >= 2);
    assert.equal(typeof question.shouldContinue, 'boolean');
    assert.notEqual(question.question, 'Como a empresa acompanha o fluxo de caixa?');

    const update = new Client({ connectionString: withDatabase(databaseName) });
    await update.connect();
    await update.query(`
      UPDATE diagnosis_submissions SET
        status = 'COMPLETED', overall_score = 60,
        summary = 'Resultado deterministico sintetico.',
        critical_points = '["Financeiro requer mais previsibilidade."]',
        opportunities = '["Existe uma rotina semanal aproveitavel."]',
        recommendations = '["Formalizar indicadores financeiros."]',
        next_steps = '["Definir responsavel e painel."]',
        pillar_scores = '[{"pillar":"Financeiro","score":60,"answersCount":1,"maturity":"intermediate"}]',
        completed_at = $1, updated_at = $1
      WHERE id = 'submission-ai-gemini'
    `, [new Date().toISOString()]);
    await update.end();

    try {
      const analysis = await service.generateAnalysis(auth, 'submission-ai-gemini');
      assert(analysis.executiveSummary.length > 0);
      assert(analysis.strengths.length > 0);
      assert(analysis.attentionPoints.length > 0);
      assert(analysis.recommendations.length > 0);
      const verify = new Client({ connectionString: withDatabase(databaseName) });
      await verify.connect();
      const persisted = await verify.query<{ overall_score: number; ai_analysis: unknown }>(
        `SELECT overall_score, ai_analysis FROM diagnosis_submissions
         WHERE id = 'submission-ai-gemini'`,
      );
      await verify.end();
      assert.equal(Number(persisted.rows[0]?.overall_score), 60);
      assert(persisted.rows[0]?.ai_analysis);
      assert.equal(calls, 2);
      console.log(JSON.stringify({
        ok: true, provider: 'gemini', api: 'openai-compatible-chat-completions',
        model: env.aiModel, calls, adaptiveQuestionValid: true,
        consultingAnalysisValid: true, scorePreserved: true,
        aiAnalysisPersisted: true, temporaryPostgres: true,
      }));
    } catch {
      console.log(JSON.stringify({
        ok: false, stopped: true, reason: lastError ?? 'AI_ANALYSIS_UNAVAILABLE',
        provider: 'gemini', api: 'openai-compatible-chat-completions',
        model: env.aiModel, calls, adaptiveQuestionValid: true,
        consultingAnalysisValid: false, temporaryPostgres: true,
      }));
    }
  }
} finally {
  if (applicationDataSource) await applicationDataSource.close();
  await drop();
  await administrator.end();
}
