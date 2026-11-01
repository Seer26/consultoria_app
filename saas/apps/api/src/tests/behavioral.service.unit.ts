import assert from 'node:assert/strict';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import type { DataSource, QueryParameters } from '../database/data-source';
import type { AuthTokenPayload } from '../modules/auth/auth.types';

process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'behavioral-service-unit-test-secret';
const { BehavioralService } = await import('../modules/behavioral/behavioral.service');
const { BehavioralRepository } = await import('../modules/behavioral/behavioral.repository');
const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE companies (id TEXT PRIMARY KEY, status TEXT NOT NULL);
  CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, role TEXT, company_id TEXT REFERENCES companies(id), status TEXT);
  INSERT INTO companies VALUES ('a', 'ACTIVE'), ('b', 'ACTIVE');
  INSERT INTO users VALUES ('employee', 'Employee', 'EMPLOYEE', 'a', 'ACTIVE'),
    ('owner', 'Owner', 'OWNER', 'a', 'ACTIVE'), ('other', 'Other', 'EMPLOYEE', 'b', 'ACTIVE'),
    ('admin', 'Admin', 'ADMIN', NULL, 'ACTIVE');`);
db.exec(fs.readFileSync(new URL('../database/migrations/010_behavioral_assessments.sql', import.meta.url), 'utf8').replaceAll('NOW()::text', "'2026-11-01T00:00:00Z'"));
const args = (parameters: QueryParameters = []) => Array.isArray(parameters) ? [...parameters] : [parameters];
// Real in-memory SQL and transactions; no service/repository behavior is mocked.
const source: Pick<DataSource, 'one' | 'many' | 'execute' | 'transaction'> = {
  async one<Row>(sql: string, parameters?: QueryParameters) { return db.prepare(sql).get(...args(parameters)) as Row | undefined; },
  async many<Row>(sql: string, parameters?: QueryParameters) { return db.prepare(sql).all(...args(parameters)) as Row[]; },
  async execute(sql: string, parameters?: QueryParameters) { return { changes: db.prepare(sql).run(...args(parameters)).changes }; },
  async transaction<Result>(operation: () => Promise<Result>) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = await operation(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  },
};
const service = new BehavioralService(new BehavioralRepository(source));
const auth = (userId: string, role: AuthTokenPayload['role'], companyId: string | null): AuthTokenPayload => ({ userId, role, companyId, authVersion: 1 });
const employee = auth('employee', 'EMPLOYEE', 'a');
const owner = auth('owner', 'OWNER', 'a');
const admin = auth('admin', 'ADMIN', null);
try {
  const started = await service.startOrResume(employee);
  assert.equal(started.status, 'IN_PROGRESS'); assert.equal(started.answeredCount, 0); assert.equal(started.totalQuestions, 20);
  assert.equal((await service.startOrResume(employee)).id, started.id);
  assert(!('result' in started) && !('executorScore' in started));
  const page = await service.getQuestions(employee, started.id);
  assert.equal(page.questions.length, 20); assert.deepEqual(page.answers, []);
  assert(!('dimension' in page.questions[0]) && !('isReverse' in page.questions[0]));
  await assert.rejects(service.saveAnswer(owner, started.id, page.questions[0].id, 3), /FORBIDDEN/);
  await assert.rejects(service.getQuestions(auth('other', 'EMPLOYEE', 'b'), started.id), /FORBIDDEN/);
  await assert.rejects(service.startOrResume(admin), /BEHAVIORAL_RESPONDENT_REQUIRED/);
  await assert.rejects(service.startOrResume({ ...employee, companyId: 'b' }), /FORBIDDEN/);
  await assert.rejects(service.saveAnswer(employee, started.id, page.questions[0].id, '3'), /BEHAVIORAL_INVALID_ANSWER/);
  await assert.rejects(service.saveAnswer(employee, started.id, 'unknown', 3), /BEHAVIORAL_QUESTION_NOT_FOUND/);
  await assert.rejects(service.complete(employee, started.id), /BEHAVIORAL_INCOMPLETE_ANSWERS/);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM behavioral_results').get() as { n: number }).n, 0);
  await service.saveAnswer(employee, started.id, page.questions[0].id, 1);
  await service.saveAnswer(employee, started.id, page.questions[0].id, 4);
  const progress = await service.startOrResume(employee);
  assert.equal(progress.answeredCount, 1);
  assert.deepEqual((await service.getQuestions(employee, started.id)).answers, [{ questionId: page.questions[0].id, value: 4 }]);
  for (const question of page.questions) await service.saveAnswer(employee, started.id, question.id, 3);
  // Failure after result insertion must roll back both persisted result and assessment status.
  db.exec(`CREATE TRIGGER reject_completion BEFORE UPDATE OF status ON behavioral_assessments
    WHEN NEW.status = 'COMPLETED' BEGIN SELECT RAISE(ABORT, 'completion_failure'); END;`);
  await assert.rejects(service.complete(employee, started.id), /completion_failure/);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM behavioral_results').get() as { n: number }).n, 0);
  assert.equal((await service.startOrResume(employee)).status, 'IN_PROGRESS');
  db.exec('DROP TRIGGER reject_completion');
  const completed = await service.complete(employee, started.id);
  assert.equal(completed.status, 'COMPLETED'); assert(completed.completedAt);
  assert(!('result' in completed) && !('executorScore' in completed));
  await assert.rejects(service.saveAnswer(employee, started.id, page.questions[0].id, 5), /BEHAVIORAL_ASSESSMENT_COMPLETED/);
  await assert.rejects(service.complete(employee, started.id), /BEHAVIORAL_ASSESSMENT_COMPLETED/);
  await assert.rejects(service.getQuestions(employee, started.id), /BEHAVIORAL_ASSESSMENT_COMPLETED/);
  for (const respondent of [owner, employee]) {
    await assert.rejects(service.getAdminResult(respondent, 'a', started.id), /BEHAVIORAL_ADMIN_REQUIRED/);
    await assert.rejects(service.getHistory(respondent, 'a', 'employee'), /BEHAVIORAL_ADMIN_REQUIRED/);
    await assert.rejects(service.listCompanyAssessments(respondent, 'a'), /BEHAVIORAL_ADMIN_REQUIRED/);
  }
  const result = await service.getAdminResult(admin, 'a', started.id);
  assert.equal(result.result.executorScore, 50); assert.equal(result.result.predominantDimension, null);
  assert.equal(result.answers.length, 20); assert.equal(result.questions.length, 20);
  await assert.rejects(service.getAdminResult(admin, 'b', started.id), /FORBIDDEN/);
  await assert.rejects(service.getHistory(admin, 'b', 'employee'), /FORBIDDEN/);
  await assert.rejects(service.listCompanyAssessments(admin, 'a', { userId: 'other' }), /FORBIDDEN/);
  await assert.rejects(service.listCompanyAssessments(admin, 'a', { status: 'invalid' as never }), /BEHAVIORAL_INVALID_STATUS/);
  // New active version must only affect new assessments; completed history remains V1.
  db.exec(`UPDATE behavioral_questionnaires SET active = FALSE;
    INSERT INTO behavioral_questionnaires VALUES (2, TRUE, '2026-11-02');
    INSERT INTO behavioral_questions SELECT id || '-v2', 2, dimension, text, is_reverse, position, active FROM behavioral_questions WHERE questionnaire_version = 1;`);
  const next = await service.startOrResume(employee);
  assert.notEqual(next.id, started.id); assert.equal(next.questionnaireVersion, 2);
  await assert.rejects(service.saveAnswer(employee, next.id, page.questions[0].id, 3), /BEHAVIORAL_QUESTION_NOT_FOUND/);
  assert.equal((await service.getAdminResult(admin, 'a', started.id)).assessment.questionnaireVersion, 1);
  const history = await service.getHistory(admin, 'a', 'employee');
  assert.equal(history.length, 2); assert.equal(history.filter((item) => item.status === 'COMPLETED').length, 1);
  const list = await service.listCompanyAssessments(admin, 'a', { status: 'COMPLETED' });
  assert.equal(list.length, 1); assert.equal(list[0].userName, 'Employee'); assert.equal(list[0].userRole, 'EMPLOYEE');
  // DB membership, not token claims, decides ownership even after account transfer.
  db.prepare("UPDATE users SET company_id = 'b' WHERE id = 'employee'").run();
  await assert.rejects(service.saveAnswer(employee, next.id, `${page.questions[0].id}-v2`, 3), /FORBIDDEN/);
  await assert.rejects(service.getAdminResult(admin, 'a', started.id), /FORBIDDEN/);
  console.log('Behavioral service/repository unit tests passed');
} finally { db.close(); }
