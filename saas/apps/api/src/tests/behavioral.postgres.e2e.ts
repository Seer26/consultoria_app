import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Client } from 'pg';
import type { BehavioralAssessmentSummary, BehavioralListItem } from '../modules/behavioral/behavioral.types';
import type { AuthTokenPayload } from '../modules/auth/auth.types';

dotenv.config({ path: '.env.local', override: true, quiet: true });
const sqlite = process.argv.includes('--sqlite');
const sqliteDirectory = sqlite ? await fs.mkdtemp(path.join(os.tmpdir(), 'behavioral-http-test-')) : undefined;
const sqlitePath = sqliteDirectory ? path.join(sqliteDirectory, 'behavioral.sqlite') : '';
const sourceUrl = process.env.DATABASE_URL?.trim();
assert(sqlite || sourceUrl, 'BEHAVIORAL_HTTP_TEST_REQUIRES_LOCAL_POSTGRES');
const localUrl = new URL(sourceUrl || 'postgres://localhost/consultoria_local');
assert(sqlite || (['localhost', '127.0.0.1', '[::1]'].includes(localUrl.hostname)
  && ['/consultoria_local', '/consultoria_dev'].includes(localUrl.pathname)), 'BEHAVIORAL_HTTP_TEST_REQUIRES_LOCAL_POSTGRES');
const database = `consultoria_behavioral_http_${process.pid}_${Date.now()}_test`;
assert(/^consultoria_behavioral_http_\d+_\d+_test$/.test(database));
const withDatabase = (name: string) => {
  const url = new URL(localUrl); url.pathname = `/${name}`; return url.toString();
};
const secret = 'behavioral-http-e2e-secret-with-adequate-length';
Object.assign(process.env, {
  NODE_ENV: 'test', APP_ENV: 'postgres-test', ENABLE_DEMO_SEED: 'false',
  DATABASE_URL: sqlite ? '' : withDatabase(database), DATABASE_PATH: sqlitePath, JWT_SECRET: secret,
  REQUIRE_LEGAL_ACCEPTANCE: 'false', AI_ENABLED: 'false',
});

type Json = Record<string, unknown>;
type Questions = { assessment: BehavioralAssessmentSummary; questions: { id: string; text: string; position: number }[];
  answers: { questionId: string; value: number }[] };
type AdminResult = { assessment: BehavioralAssessmentSummary; user: { id: string }; result: Json; questions: Json[]; answers: Json[] };
const actors: AuthTokenPayload[] = [
  { userId: 'admin', role: 'ADMIN', companyId: null, authVersion: 0 },
  { userId: 'owner-a', role: 'OWNER', companyId: 'company-a', authVersion: 0 },
  { userId: 'employee-a', role: 'EMPLOYEE', companyId: 'company-a', authVersion: 0 },
  { userId: 'peer-a', role: 'EMPLOYEE', companyId: 'company-a', authVersion: 0 },
  { userId: 'owner-b', role: 'OWNER', companyId: 'company-b', authVersion: 0 },
  { userId: 'employee-b', role: 'EMPLOYEE', companyId: 'company-b', authVersion: 0 },
];
const tokens = new Map(actors.map((actor) => [actor.userId, jwt.sign(actor, secret)]));
const admin = tokens.get('admin')!;
const current = '/behavioral/assessments/current';
const assessmentPath = (id: string) => `/behavioral/assessments/${id}`;
const companyPath = (id: string) => `/behavioral/companies/${id}`;
const scenarios: string[] = [];

// Detect any new score/processing fields anywhere in a respondent payload.
function privatePayload(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(!/score|dimension|reverse|result|history|chart|adjusted|processed/i.test(key), `Sensitive respondent field: ${key}`);
    privatePayload(child);
  }
}

const administrator = new Client({ connectionString: withDatabase('postgres') });
let created = false;
let client: { query(sql: string, parameters?: unknown[]): Promise<{ rows: Json[] }> };
let postgresClient: Client | undefined;
let sqliteDatabase: { open: boolean; close(): void } | undefined;
let server: http.Server | undefined;
let source: { close(): Promise<void> } | undefined;
try {
  if (!sqlite) {
    await administrator.connect();
    // Never reuse or delete an existing database, including the source database.
    await administrator.query(`CREATE DATABASE "${database}"`); created = true;
    const { runPostgresMigrations } = await import('../database/migrate');
    await runPostgresMigrations();
    postgresClient = new Client({ connectionString: withDatabase(database) }); await postgresClient.connect();
    client = postgresClient;
  } else {
    // Supplementary HTTP checks use real disposable SQLite, never PostgreSQL emulation.
    const { database: db } = await import('../db/database');
    sqliteDatabase = db;
    db.exec((await fs.readFile(new URL('../database/migrations/010_behavioral_assessments.sql', import.meta.url), 'utf8'))
      .replaceAll('NOW()::text', "'2026-11-01T00:00:00Z'"));
    client = { async query(sql, parameters = []) {
      const values: unknown[] = [];
      const translated = sql.replace(/NOW\(\)::text/g, "'2026-11-01T00:00:00Z'")
        .replace(/::int/g, '').replace(/\$(\d+)/g, (_match, index: string) => {
          values.push(parameters[Number(index) - 1]); return '?';
        });
      if (!parameters.length && translated.includes(';')) { db.exec(translated); return { rows: [] }; }
      const statement = db.prepare(translated);
      if (statement.reader) return { rows: statement.all(...values) as Json[] };
      statement.run(...values); return { rows: [] };
    } };
  }
  const { dataSource } = await import('../database/data-source'); source = dataSource;
  await client.query(`INSERT INTO companies (id, name, slug, status, created_at, updated_at)
    VALUES ('company-a', 'Company A', 'behavioral-http-a', 'ACTIVE', NOW()::text, NOW()::text),
           ('company-b', 'Company B', 'behavioral-http-b', 'ACTIVE', NOW()::text, NOW()::text)`);
  for (const actor of actors) {
    await client.query(`INSERT INTO users (id, name, email, password_hash, role, company_id, status, auth_version, created_at, updated_at)
      VALUES ($1, $1, $2, 'unused-test-hash', $3, $4, 'ACTIVE', 0, NOW()::text, NOW()::text)`,
    [actor.userId, `${actor.userId}@behavioral.example.invalid`, actor.role, actor.companyId]);
  }
  await client.query(`INSERT INTO behavioral_questionnaires (version, active, created_at) VALUES (2, false, NOW()::text);
    INSERT INTO behavioral_questions (id, questionnaire_version, dimension, text, is_reverse, position, active)
    VALUES ('future-question', 2, 'EXECUTOR', 'Future version', false, 1, true)`);
  const { app } = await import('../app');
  server = http.createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  async function call<T = Json>(method: string, pathname: string, token?: string, body?: Json, expected = 200): Promise<T> {
    const response = await fetch(`${base}${pathname}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();
    assert.equal(response.status, expected, `${method} ${pathname}: ${JSON.stringify(payload)}`);
    if (expected >= 400) assert.deepEqual(Object.keys(payload), ['error'], 'Errors must not leak sensitive payloads');
    return payload as T;
  }

  const assessments = new Map<string, BehavioralAssessmentSummary>();
  for (const actor of actors.filter((actor) => actor.role !== 'ADMIN')) {
    // userId/companyId in body and query must never select another respondent.
    const started = await call<BehavioralAssessmentSummary>('POST', `${current}?userId=employee-b&companyId=company-b`,
      tokens.get(actor.userId), { userId: 'employee-b', companyId: 'company-b' }, 201);
    assert.equal(started.userId, actor.userId); assert.equal(started.companyId, actor.companyId);
    assert.equal(started.status, 'IN_PROGRESS'); assert.equal(started.questionnaireVersion, 1);
    assert.equal(started.answeredCount, 0); assert.equal(started.totalQuestions, 20); privatePayload(started);
    const resumed = await call<BehavioralAssessmentSummary>('POST', current, tokens.get(actor.userId), {}, 201);
    assert.equal(resumed.id, started.id); assessments.set(actor.userId, started);
  }
  scenarios.push('OWNER/EMPLOYEE start and resume only themselves despite manipulated body/query IDs');
  const own = assessments.get('employee-a')!;
  const ownPath = assessmentPath(own.id);
  const page = await call<Questions>('GET', `${ownPath}/questions`, tokens.get('employee-a'));
  assert.equal(page.questions.length, 20); assert.deepEqual(page.answers, []); privatePayload(page);
  const questionId = page.questions[0].id;

  const routes: [string, string][] = [
    ['POST', current], ['GET', `${ownPath}/questions`], ['PUT', `${ownPath}/answers/${questionId}`],
    ['POST', `${ownPath}/complete`], ['GET', `${companyPath('company-a')}/assessments`],
    ['GET', `${companyPath('company-a')}/users/employee-a/history`],
    ['GET', `${companyPath('company-a')}/assessments/${own.id}/result`],
  ];
  for (const [method, route] of routes) await call(method, route, undefined, undefined, 401);
  await call('POST', current, admin, {}, 403);
  scenarios.push('all seven endpoints require authentication; ADMIN cannot answer');

  for (const actor of actors.filter((actor) => actor.role !== 'ADMIN')) {
    for (const target of actors.filter((target) => target.role !== 'ADMIN' && target.userId !== actor.userId)) {
      const path = assessmentPath(assessments.get(target.userId)!.id);
      await call('GET', `${path}/questions`, tokens.get(actor.userId), undefined, 403);
      await call('PUT', `${path}/answers/${questionId}`, tokens.get(actor.userId), { value: 4 }, 403);
      await call('POST', `${path}/complete`, tokens.get(actor.userId), {}, 403);
    }
  }
  assert.equal((await client.query('SELECT COUNT(*)::int AS count FROM behavioral_answers')).rows[0].count, 0);
  scenarios.push('OWNER cannot operate employee; EMPLOYEE cannot operate peer; cross-company IDs denied');

  for (const value of [0, 6, 1.5, '3', null]) {
    await call('PUT', `${ownPath}/answers/${questionId}`, tokens.get('employee-a'), { value }, 400);
  }
  await call('PUT', `${ownPath}/answers/future-question`, tokens.get('employee-a'), { value: 3 }, 404);
  await call('PUT', `${ownPath}/answers/missing`, tokens.get('employee-a'), { value: 3 }, 404);
  await call('POST', `${ownPath}/complete`, tokens.get('employee-a'), {}, 400);
  await call('GET', `${assessmentPath('missing')}/questions`, tokens.get('employee-a'), undefined, 404);
  scenarios.push('invalid values, another questionnaire version, missing IDs and incomplete completion rejected');

  // Complete one OWNER and one EMPLOYEE in A, and one EMPLOYEE in B.
  for (const userId of ['owner-a', 'employee-a', 'employee-b']) {
    const path = assessmentPath(assessments.get(userId)!.id);
    for (const question of page.questions) {
      privatePayload(await call('PUT', `${path}/answers/${question.id}`, tokens.get(userId),
        { value: 3, userId: 'employee-b', companyId: 'company-b' }));
    }
    const progress = await call<Questions>('GET', `${path}/questions`, tokens.get(userId));
    assert.equal(progress.assessment.answeredCount, 20); assert.equal(progress.answers.length, 20); privatePayload(progress);
    const completed = await call('POST', `${path}/complete`, tokens.get(userId), {});
    assert.deepEqual(Object.keys(completed).sort(), ['completedAt', 'id', 'status']);
    assert.equal(completed.status, 'COMPLETED'); assert.equal(typeof completed.completedAt, 'string'); privatePayload(completed);
    await call('PUT', `${path}/answers/${questionId}`, tokens.get(userId), { value: 5 }, 409);
    await call('POST', `${path}/complete`, tokens.get(userId), {}, 409);
    await call('GET', `${path}/questions`, tokens.get(userId), undefined, 409);
  }
  scenarios.push('OWNER/EMPLOYEE answer and complete with safe payloads; completed answers cannot be read or changed');

  for (const userId of ['owner-a', 'employee-a', 'peer-a', 'owner-b', 'employee-b']) {
    for (const companyId of ['company-a', 'company-b']) {
      const prefix = companyPath(companyId);
      await call('GET', `${prefix}/assessments`, tokens.get(userId), undefined, 403);
      for (const target of ['owner-a', 'employee-a', 'employee-b']) {
        await call('GET', `${prefix}/users/${target}/history`, tokens.get(userId), undefined, 403);
        await call('GET', `${prefix}/assessments/${assessments.get(target)!.id}/result`, tokens.get(userId), undefined, 403);
      }
    }
  }
  scenarios.push('all respondents denied own/other results, processed answers, histories and tenant lists');

  const resultUrl = `${companyPath('company-a')}/assessments/${own.id}/result`;
  const result = await call<AdminResult>('GET', resultUrl, admin);
  assert.equal(result.assessment.id, own.id); assert.equal(result.user.id, 'employee-a');
  assert.equal(result.result.executorScore, 50); assert.equal(result.result.comunicadorScore, 50);
  assert.equal(result.result.planejadorScore, 50); assert.equal(result.result.analiticoScore, 50);
  assert.equal(result.result.predominantDimension, null); assert.equal(result.questions.length, 20); assert.equal(result.answers.length, 20);
  const next = await call<BehavioralAssessmentSummary>('POST', current, tokens.get('employee-a'), {}, 201);
  assert.notEqual(next.id, own.id);
  const history = await call<BehavioralListItem[]>('GET', `${companyPath('company-a')}/users/employee-a/history`, admin);
  assert.deepEqual(new Set(history.map((item) => item.id)), new Set([own.id, next.id]));
  assert.equal(history.filter((item) => item.status === 'COMPLETED').length, 1);
  const allA = await call<BehavioralListItem[]>('GET', `${companyPath('company-a')}/assessments`, admin);
  assert.equal(allA.length, 4); assert(allA.every((item) => item.companyId === 'company-a'));
  assert(allA.every((item) => item.userName && item.userRole));
  const selected = await call<BehavioralListItem[]>('GET', `${companyPath('company-a')}/assessments?userId=employee-a&status=COMPLETED`, admin);
  assert.deepEqual(selected.map((item) => item.id), [own.id]);
  const allB = await call<BehavioralListItem[]>('GET', `${companyPath('company-b')}/assessments`, admin);
  assert.equal(allB.length, 2); assert(allB.every((item) => item.companyId === 'company-b'));
  await call('GET', `${companyPath('company-a')}/assessments?status=invalid`, admin, undefined, 400);
  for (const query of ['userId=', 'status=', 'userId=employee-a&userId=employee-b', 'status[unexpected]=COMPLETED']) {
    await call('GET', `${companyPath('company-a')}/assessments?${query}`, admin, undefined, 400);
  }
  await call('GET', `${companyPath('company-a')}/assessments?userId=employee-b`, admin, undefined, 403);
  await call('GET', `${companyPath('company-a')}/users/employee-b/history`, admin, undefined, 403);
  await call('GET', `${companyPath('company-b')}/assessments/${own.id}/result`, admin, undefined, 403);
  await call('GET', `${companyPath('company-a')}/assessments/${assessments.get('employee-b')!.id}/result`, admin, undefined, 403);
  await call('GET', `${companyPath('company-a')}/assessments/${next.id}/result`, admin, undefined, 404);
  await call('GET', `${companyPath('company-a')}/assessments/missing/result`, admin, undefined, 404);
  await call('GET', `${companyPath('company-a')}/users/missing/history`, admin, undefined, 404);
  await call('GET', `${companyPath('missing')}/assessments`, admin, undefined, 404);
  scenarios.push('ADMIN gets selected tenant list/result/history and filters; mismatched company/user/assessment IDs denied');

  // Rejected writes cannot alter the persisted completion or its answers.
  assert.equal((await client.query('SELECT value FROM behavioral_answers WHERE assessment_id = $1 AND question_id = $2',
    [own.id, questionId])).rows[0].value, 3);
  assert.equal((await client.query('SELECT COUNT(*)::int AS count FROM behavioral_results')).rows[0].count, 3);
  assert.deepEqual((await call<AdminResult>('GET', resultUrl, admin)).result, result.result);
  console.log(JSON.stringify({ ok: true, provider: sqlite ? 'sqlite' : 'postgres', scenarios }));
} finally {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  if (postgresClient) await postgresClient.end();
  if (source) await source.close();
  if (sqliteDatabase?.open) sqliteDatabase.close();
  if (sqliteDirectory) {
    for (const suffix of ['', '-wal', '-shm']) await fs.rm(`${sqlitePath}${suffix}`, { force: true });
    await fs.rmdir(sqliteDirectory);
  }
  if (created) await administrator.query(`DROP DATABASE "${database}"`);
  if (!sqlite) await administrator.end();
}
