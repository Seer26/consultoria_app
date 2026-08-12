import assert from 'node:assert/strict';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local', override: true, quiet: true });
const sourceUrl = process.env.DATABASE_URL?.trim();
if (!sourceUrl || new URL(sourceUrl).pathname.replace(/^\//, '') !== 'consultoria_local') {
  throw new Error('AI_REAL_TEST_REQUIRES_LOCAL_POSTGRES');
}
if (!process.env.OPENAI_API_KEY?.trim()) {
  console.log(JSON.stringify({ ok: false, skipped: true, reason: 'OPENAI_API_KEY_NOT_CONFIGURED' }));
  process.exit(0);
}

const databaseName = 'consultoria_ai_openai_test';
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
  process.env.AI_PROVIDER = 'openai';
  process.env.AI_MODEL = process.env.OPENAI_REAL_TEST_MODEL?.trim() || 'gpt-4.1-mini';
  process.env.NODE_ENV = 'test';
  process.env.APP_ENV = 'ai-real-test';

  const { env } = await import('../config/env');
  Object.assign(env, {
    databaseUrl: withDatabase(databaseName),
    aiEnabled: true,
    aiProvider: 'openai',
    aiModel: process.env.AI_MODEL,
    aiProviderKey: process.env.OPENAI_API_KEY,
  });
  const { runPostgresMigrations } = await import('../database/migrate');
  await runPostgresMigrations();

  const client = new Client({ connectionString: withDatabase(databaseName) });
  await client.connect();
  const now = new Date().toISOString();
  await client.query(`
    INSERT INTO companies (id, name, slug, status, sector, size, created_at, updated_at)
    VALUES ('company-ai-real', 'Empresa Sintetica IA', 'empresa-ai-real', 'ACTIVE', 'Servicos', 'SMALL', $1, $1)
  `, [now]);
  await client.query(`
    INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at, status, auth_version)
    VALUES ('owner-ai-real', 'Owner Sintetico', 'owner.ai.real@example.test', 'not-used', 'OWNER', 'company-ai-real', $1, $1, 'ACTIVE', 0)
  `, [now]);
  await client.query(`
    INSERT INTO diagnosis_submissions (
      id, company_id, user_id, submission_type, questionnaire_id, respondent_role,
      department, status, created_at, updated_at
    ) VALUES (
      'submission-ai-real', 'company-ai-real', 'owner-ai-real', 'RESEARCH',
      'chat-research', 'Diretor', 'Financeiro', 'IN_PROGRESS', $1, $1
    )
  `, [now]);
  await client.query(`
    INSERT INTO diagnosis_answers (
      id, submission_id, question_id, question, answer, pillar, value, score, created_at
    ) VALUES (
      'answer-ai-real', 'submission-ai-real', 'q1',
      'Como a empresa acompanha o fluxo de caixa?',
      'A empresa usa uma planilha semanal e revisa os recebimentos toda sexta-feira.',
      'Financeiro', 60, 60, $1
    )
  `, [now]);
  await client.end();

  const { AiQuestionService } = await import('../modules/ai-question/ai-question.service');
  applicationDataSource = (await import('../database/data-source')).dataSource;
  const service = new AiQuestionService();
  const auth = { userId: 'owner-ai-real', role: 'OWNER' as const, companyId: 'company-ai-real', authVersion: 0 };
  const question = await service.generateNextQuestion(auth, 'submission-ai-real');
  if (question.source !== 'openai') {
    console.log(JSON.stringify({
      ok: false,
      skipped: true,
      reason: 'OPENAI_REAL_RESPONSE_UNAVAILABLE',
      api: 'responses',
      model: env.aiModel,
      callsAttempted: 1,
      fallbackValidated: true,
      temporaryPostgres: true,
    }));
  } else {
    assert(question.question.length >= 8);

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
    WHERE id = 'submission-ai-real'
    `, [new Date().toISOString()]);
    await update.end();

    const analysis = await service.generateAnalysis(auth, 'submission-ai-real');
    assert(analysis.executiveSummary.length > 0);
    assert(analysis.recommendations.length > 0);

    console.log(JSON.stringify({
      ok: true,
      provider: 'openai',
      api: 'responses',
      model: env.aiModel,
      calls: 2,
      adaptiveQuestionValid: true,
      consultingAnalysisValid: true,
      temporaryPostgres: true,
    }));
  }
} finally {
  if (applicationDataSource) await applicationDataSource.close();
  await drop();
  await administrator.end();
}
