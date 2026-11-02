import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import dotenv from 'dotenv';
import { Client } from 'pg';

// Each write below catches a missing constraint, guard, index or historical snapshot.
const migrationsDir = path.resolve('src/database/migrations');
const filename = '011_competency_assessments.sql';
assert((await fs.readdir(migrationsDir)).includes(filename), `Missing migration ${filename}`);
const migrationSql = await fs.readFile(path.join(migrationsDir, filename), 'utf8');
dotenv.config({ path: '.env.local', quiet: true });
const sourceConnectionString = process.env.DATABASE_URL?.trim();
assert(sourceConnectionString, 'COMPETENCIES_MIGRATION_TEST_REQUIRES_LOCAL_POSTGRES');
const sourceUrl = new URL(sourceConnectionString);
assert(['localhost', '127.0.0.1', '[::1]'].includes(sourceUrl.hostname)
  && sourceUrl.pathname === '/consultoria_local', 'COMPETENCIES_MIGRATION_TEST_REQUIRES_LOCAL_POSTGRES');
const database = `consultoria_competencies_${process.pid}_${Date.now()}_test`;
assert(/^consultoria_competencies_\d+_\d+_test$/.test(database));
function withDatabase(name: string) {
  const url = new URL(sourceUrl);
  url.pathname = `/${name}`;
  return url.toString();
}
const expectedCatalog = [
  ['Comunicação profissional', 'Transmite informações de trabalho com clareza, contexto e objetividade.', 'Comunicação'],
  ['Organização e planejamento do trabalho', 'Estrutura atividades, etapas, prazos e recursos necessários.', 'Execução'],
  ['Gestão de prioridades', 'Identifica o que exige atenção e sequencia atividades de forma adequada.', 'Execução'],
  ['Execução de processos e rotinas', 'Realiza atividades seguindo procedimentos, critérios e prazos definidos.', 'Execução'],
  ['Qualidade e atenção aos detalhes', 'Verifica informações e entregas antes de concluir uma atividade.', 'Qualidade'],
  ['Resolução de problemas', 'Identifica causas, avalia alternativas e encaminha soluções viáveis.', 'Análise'],
  ['Análise e interpretação de informações', 'Usa dados, documentos e evidências para apoiar decisões.', 'Análise'],
  ['Uso de ferramentas e sistemas de trabalho', 'Utiliza adequadamente ferramentas, sistemas e recursos necessários à função.', 'Técnica'],
  ['Aplicação de conhecimento técnico', 'Emprega conhecimentos próprios da atividade para executar entregas corretas.', 'Técnica'],
  ['Registro e documentação', 'Mantém registros, evidências e documentação necessários ao trabalho.', 'Qualidade'],
  ['Atendimento e orientação ao cliente', 'Compreende a necessidade apresentada e conduz o atendimento de cliente interno ou externo de forma adequada.', 'Relacionamento profissional'],
  ['Coordenação de atividades', 'Distribui, acompanha e integra atividades quando há responsabilidade de coordenação.', 'Gestão'],
];
const admin = new Client({ connectionString: withDatabase('postgres') });
let created = false;
await admin.connect();
try {
  // Drop only the database successfully created by this invocation, never the source.
  await admin.query(`CREATE DATABASE "${database}"`);
  created = true;
  const client = new Client({ connectionString: withDatabase(database) });
  await client.connect();
  try {
    const runMigrations = async () => {
      await promisify(execFile)(process.execPath, ['--import', 'tsx', 'src/database/migrate.ts'], {
        cwd: process.cwd(), env: { ...process.env, DATABASE_URL: withDatabase(database) },
      });
    };
    await runMigrations();
    const registrations = await client.query('SELECT * FROM schema_migrations ORDER BY id');
    assert.equal(registrations.rows.filter((row) => row.filename === filename).length, 1);
    assert.equal(registrations.rows.find((row) => row.filename === filename)?.id, '011_competency_assessments');
    await runMigrations();
    assert.deepEqual((await client.query('SELECT * FROM schema_migrations ORDER BY id')).rows, registrations.rows);
    const tables = await client.query(`SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('competencies', 'competency_assessments', 'competency_assessment_items') ORDER BY table_name`);
    assert.deepEqual(tables.rows.map((row) => row.table_name), ['competencies', 'competency_assessment_items', 'competency_assessments']);
    const catalogQuery = `SELECT * FROM competencies WHERE scope = 'SYSTEM' ORDER BY id`;
    const catalog = (await client.query(catalogQuery)).rows;
    assert.equal(catalog.length, 12);
    assert.deepEqual(catalog.map((row) => [row.name, row.description, row.category]), expectedCatalog);
    assert(catalog.every((row) => row.scope === 'SYSTEM' && row.company_id === null && row.status === 'ACTIVE'));
    assert(catalog.every((row) => row.created_at && row.updated_at));
    const indexes = (await client.query(`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public'
      AND tablename IN ('competencies', 'competency_assessments', 'competency_assessment_items')`)).rows.map((row) => row.indexdef);
    assert(indexes.some((definition) => /\(company_id, subject_user_id, created_at DESC\)/.test(definition)));
    assert(indexes.some((definition) => /UNIQUE INDEX/.test(definition)
      && /\(company_id, subject_user_id\)/.test(definition) && /WHERE.*IN_PROGRESS/.test(definition)));
    assert(indexes.some((definition) => /UNIQUE INDEX/.test(definition) && /lower\(btrim\(name\)\)/.test(definition)
      && /WHERE.*SYSTEM/.test(definition) && /ACTIVE/.test(definition)));
    assert(indexes.some((definition) => /UNIQUE INDEX/.test(definition) && /company_id, lower\(btrim\(name\)\)/.test(definition)
      && /WHERE.*COMPANY/.test(definition) && /ACTIVE/.test(definition)));
    const fks = (await client.query(`SELECT conrelid::regclass::text AS table_name, confdeltype, confupdtype
      FROM pg_constraint WHERE contype = 'f' AND conrelid IN
      ('competencies'::regclass, 'competency_assessments'::regclass, 'competency_assessment_items'::regclass)`)).rows;
    assert.equal(fks.length, 7);
    assert(fks.every((row) => ['a', 'r'].includes(row.confdeltype) && ['a', 'r'].includes(row.confupdtype)));
    async function rejects(sql: string, values: unknown[] = [], code = '23514') {
      await assert.rejects(client.query(sql, values), (error: unknown) =>
        error instanceof Error && 'code' in error && error.code === code, `${code}: ${sql}`);
    }
    await client.query(`INSERT INTO companies (id, name, slug, created_at, updated_at)
      VALUES ('company-a', 'Company A', 'competencies-a', NOW()::text, NOW()::text),
             ('company-b', 'Company B', 'competencies-b', NOW()::text, NOW()::text);
      INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at)
      VALUES ('subject', 'Subject', 'competency-subject@example.invalid', 'hash', 'EMPLOYEE', 'company-a', NOW()::text, NOW()::text),
             ('admin', 'Admin', 'competency-admin@example.invalid', 'hash', 'ADMIN', NULL, NOW()::text, NOW()::text)`);
    const insertCompetency = `INSERT INTO competencies (id, company_id, scope, name, description, category, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Custom description', NULL, $5, NOW()::text, NOW()::text)`;
    await client.query(insertCompetency, ['private-a', 'company-a', 'COMPANY', 'Private skill', 'ACTIVE']);
    await client.query(insertCompetency, ['private-b', 'company-b', 'COMPANY', '  PRIVATE SKILL  ', 'ACTIVE']);
    await client.query(insertCompetency, ['inactive-a', 'company-a', 'COMPANY', 'Private skill', 'INACTIVE']);
    await client.query(insertCompetency, ['inactive-system', null, 'SYSTEM', expectedCatalog[0][0], 'INACTIVE']);
    await rejects(insertCompetency, ['duplicate-a', 'company-a', 'COMPANY', ' PRIVATE SKILL ', 'ACTIVE'], '23505');
    await rejects(insertCompetency, ['duplicate-system', null, 'SYSTEM', ` ${expectedCatalog[0][0].toUpperCase()} `, 'ACTIVE'], '23505');
    await rejects(`UPDATE competencies SET status = 'ACTIVE' WHERE id = 'inactive-a'`, [], '23505');
    for (const [id, company, scope, status] of [
      ['bad-system-company', 'company-a', 'SYSTEM', 'ACTIVE'], ['bad-company-null', null, 'COMPANY', 'ACTIVE'],
      ['bad-scope', null, 'OTHER', 'ACTIVE'], ['bad-status', null, 'SYSTEM', 'OTHER'],
    ]) await rejects(insertCompetency, [id, company, scope, id, status]);
    await rejects(insertCompetency, ['missing-company', 'missing', 'COMPANY', 'Missing', 'ACTIVE'], '23503');

    const insertAssessment = `INSERT INTO competency_assessments
      (id, company_id, subject_user_id, started_by_user_id, subject_name_snapshot, started_by_name_snapshot,
       status, started_at, completed_at, created_at)
      VALUES ($1, $2, $3, $4, 'Subject snapshot', 'Admin snapshot', $5, NOW()::text, $6, NOW()::text)`;
    const draft = (id: string, company = 'company-a') => client.query(insertAssessment, [id, company, 'subject', 'admin', 'IN_PROGRESS', null]);
    await draft('assessment-a');
    await draft('assessment-b', 'company-b'); // Unique draft is scoped to the company/person pair.
    await rejects(insertAssessment, ['duplicate', 'company-a', 'subject', 'admin', 'IN_PROGRESS', null], '23505');
    await rejects(insertAssessment, ['bad-status', 'company-a', 'subject', 'admin', 'OTHER', null]);
    await rejects(insertAssessment, ['bad-time', 'company-a', 'subject', 'admin', 'IN_PROGRESS', '2026-11-02T12:00:00Z']);
    await rejects(insertAssessment, ['completed-empty', 'company-a', 'subject', 'admin', 'COMPLETED', '2026-11-02T12:00:00Z']);
    await rejects(insertAssessment, ['missing-company', 'missing', 'subject', 'admin', 'IN_PROGRESS', null], '23503');
    await rejects(insertAssessment, ['missing-subject', 'company-a', 'missing', 'admin', 'IN_PROGRESS', null], '23503');
    await rejects(insertAssessment, ['missing-admin', 'company-a', 'admin', 'missing', 'IN_PROGRESS', null], '23503');
    await rejects(`UPDATE competency_assessments SET completed_by_user_id = 'missing' WHERE id = 'assessment-a'`, [], '23503');
    await rejects(`UPDATE competency_assessments SET status = 'COMPLETED', completed_at = NOW()::text WHERE id = 'assessment-a'`);
    const insertItem = `INSERT INTO competency_assessment_items
      (id, assessment_id, competency_id, competency_name_snapshot, competency_description_snapshot,
       competency_category_snapshot, competency_scope_snapshot, evidence_status, level, observation, created_at, updated_at)
      VALUES ($1, $2, $3, 'Skill snapshot', 'Description snapshot', 'Category snapshot', $4, $5, $6, 'Evidence', NOW()::text, NOW()::text)`;
    await client.query(insertItem, ['not-observed', 'assessment-a', catalog[0].id, 'SYSTEM', 'NOT_OBSERVED', null]);
    for (const level of [1, 2, 3, 4, 5]) {
      await client.query(insertItem, [`rated-${level}`, 'assessment-a', catalog[level].id, 'SYSTEM', 'RATED', level]);
    }
    await client.query(insertItem, ['private-item', 'assessment-a', 'private-a', 'COMPANY', 'NOT_OBSERVED', null]);
    for (const [state, level] of [['RATED', 0], ['RATED', 6], ['RATED', null], ['NOT_OBSERVED', 1], ['NOT_OBSERVED', 0], ['OTHER', null]]) {
      await rejects(insertItem, ['invalid', 'assessment-a', catalog[6].id, 'SYSTEM', state, level]);
    }
    await rejects(insertItem, ['invalid-scope', 'assessment-a', catalog[6].id, 'OTHER', 'RATED', 3]);
    await rejects(insertItem, ['null-state', 'assessment-a', catalog[6].id, 'SYSTEM', null, null], '23502');
    await rejects(insertItem, ['duplicate-item', 'assessment-a', catalog[0].id, 'SYSTEM', 'RATED', 3], '23505');
    await rejects(insertItem, ['missing-parent', 'missing', catalog[0].id, 'SYSTEM', 'RATED', 3], '23503');
    await rejects(insertItem, ['missing-competency', 'assessment-a', 'missing', 'SYSTEM', 'RATED', 3], '23503');
    await rejects(`DELETE FROM competencies WHERE id = 'private-a'`, [], '23503');
    await rejects(`DELETE FROM companies WHERE id = 'company-a'`, [], '23503');
    await rejects(`DELETE FROM users WHERE id = 'subject'`, [], '23503');
    await rejects(`DELETE FROM users WHERE id = 'admin'`, [], '23503');
    await rejects(`UPDATE competency_assessments SET status = 'COMPLETED' WHERE id = 'assessment-a'`);
    await client.query(`UPDATE competency_assessments SET status = 'COMPLETED', completed_at = NOW()::text,
      completed_by_user_id = 'admin', completed_by_name_snapshot = 'Finisher snapshot' WHERE id = 'assessment-a'`);
    await draft('new-draft');
    await client.query(insertItem, ['draft-item', 'new-draft', catalog[7].id, 'SYSTEM', 'RATED', 2]);
    await rejects(`UPDATE competency_assessments SET subject_name_snapshot = 'Tampered' WHERE id = 'assessment-a'`);
    await rejects(`UPDATE competency_assessments SET status = 'IN_PROGRESS', completed_at = NULL WHERE id = 'assessment-a'`);
    await rejects(`UPDATE competency_assessments SET id = 'moved' WHERE id = 'assessment-a'`);
    await rejects(`DELETE FROM competency_assessments WHERE id = 'assessment-a'`);
    await rejects(insertItem, ['after-complete', 'assessment-a', catalog[8].id, 'SYSTEM', 'RATED', 3]);
    await rejects(`UPDATE competency_assessment_items SET level = 4 WHERE id = 'rated-1'`);
    await rejects(`DELETE FROM competency_assessment_items WHERE id = 'rated-1'`);
    await rejects(`UPDATE competency_assessment_items SET assessment_id = 'new-draft' WHERE id = 'rated-1'`);
    await rejects(`UPDATE competency_assessment_items SET assessment_id = 'assessment-a' WHERE id = 'draft-item'`);
    // Draft updates/removal/movement remain available; all-NOT_OBSERVED completion is valid.
    await client.query(`UPDATE competency_assessment_items SET level = 5 WHERE id = 'draft-item'`);
    await client.query(`UPDATE competency_assessment_items SET assessment_id = 'assessment-b' WHERE id = 'draft-item'`);
    await client.query(`DELETE FROM competency_assessment_items WHERE id = 'draft-item'`);
    await client.query(insertItem, ['only-unobserved', 'assessment-b', catalog[0].id, 'SYSTEM', 'NOT_OBSERVED', null]);
    await client.query(`UPDATE competency_assessments SET status = 'COMPLETED', completed_at = NOW()::text WHERE id = 'assessment-b'`);
    assert.deepEqual((await client.query(`SELECT evidence_status, level FROM competency_assessment_items WHERE assessment_id = 'assessment-b'`)).rows,
      [{ evidence_status: 'NOT_OBSERVED', level: null }]);
    // Separate sessions prove item writes and completion acquire the same header lock.
    const contender = new Client({ connectionString: withDatabase(database) });
    await contender.connect();
    try {
      await contender.query(`SET lock_timeout = '500ms'`);
      await client.query(insertItem, ['locked-item', 'new-draft', catalog[7].id, 'SYSTEM', 'RATED', 2]);
      await client.query('BEGIN');
      await client.query(`UPDATE competency_assessments SET status = 'COMPLETED', completed_at = NOW()::text WHERE id = 'new-draft'`);
      for (const sql of [
        `UPDATE competency_assessment_items SET level = 3 WHERE id = 'locked-item'`,
        `DELETE FROM competency_assessment_items WHERE id = 'locked-item'`,
        `INSERT INTO competency_assessment_items SELECT 'locked-insert', assessment_id, '${catalog[8].id}',
          competency_name_snapshot, competency_description_snapshot, competency_category_snapshot,
          competency_scope_snapshot, evidence_status, level, observation, created_at, updated_at
          FROM competency_assessment_items WHERE id = 'locked-item'`,
      ]) {
        await assert.rejects(contender.query(sql), (error: unknown) =>
          error instanceof Error && 'code' in error && error.code === '55P03', 'Item write must wait for completion lock');
      }
      await client.query('COMMIT');
      await assert.rejects(contender.query(`UPDATE competency_assessment_items SET level = 3 WHERE id = 'locked-item'`),
        (error: unknown) => error instanceof Error && 'code' in error && error.code === '23514');
      // Reverse order: removal owns the header lock; completion waits and then rejects an empty draft.
      await draft('delete-race');
      await client.query(insertItem, ['removed-item', 'delete-race', catalog[7].id, 'SYSTEM', 'RATED', 2]);
      await contender.query('BEGIN');
      await contender.query(`DELETE FROM competency_assessment_items WHERE id = 'removed-item'`);
      await client.query(`SET lock_timeout = '500ms'`);
      await rejects(`UPDATE competency_assessments SET status = 'COMPLETED', completed_at = NOW()::text WHERE id = 'delete-race'`, [], '55P03');
      await contender.query('COMMIT');
      await rejects(`UPDATE competency_assessments SET status = 'COMPLETED', completed_at = NOW()::text WHERE id = 'delete-race'`);
      assert.deepEqual((await client.query(`SELECT status, completed_at FROM competency_assessments WHERE id = 'delete-race'`)).rows,
        [{ status: 'IN_PROGRESS', completed_at: null }]);
      await client.query(`SET lock_timeout = '0'`);
    } finally {
      await client.query('ROLLBACK');
      await contender.query('ROLLBACK');
      await contender.end();
    }
    const historyBefore = (await client.query(`SELECT * FROM competency_assessments WHERE status = 'COMPLETED' ORDER BY id`)).rows;
    const itemsBefore = (await client.query('SELECT * FROM competency_assessment_items ORDER BY id')).rows;
    await client.query(`UPDATE users SET name = 'Renamed' WHERE id IN ('subject', 'admin');
      UPDATE competencies SET name = 'Renamed private skill', description = 'Changed', category = 'Changed', status = 'INACTIVE' WHERE id = 'private-a'`);
    await client.query(migrationSql);
    await client.query(migrationSql);
    assert.deepEqual((await client.query(catalogQuery)).rows.filter((row) => row.id !== 'inactive-system'), catalog);
    assert.deepEqual((await client.query(`SELECT * FROM competency_assessments WHERE status = 'COMPLETED' ORDER BY id`)).rows, historyBefore);
    assert.deepEqual((await client.query('SELECT * FROM competency_assessment_items ORDER BY id')).rows, itemsBefore);
    assert.equal((await client.query(`SELECT status FROM competencies WHERE id = 'private-a'`)).rows[0].status, 'INACTIVE');
    await runMigrations();
    assert.deepEqual((await client.query('SELECT * FROM schema_migrations ORDER BY id')).rows, registrations.rows);
    console.log(JSON.stringify({ ok: true, migration: '011', tables: 3, systemV1: 12, constraints: true,
      foreignKeys: 7, indexes: true, completedImmutability: true, nonEmptyCompletion: true,
      allNotObservedCompletion: true, headerLockConcurrency: true, invalidCompletionRollback: true,
      snapshotsPreserved: true, idempotent: true, runnerRegistration: true }));
  } finally {
    await client.end();
  }
} finally {
  if (created) await admin.query(`DROP DATABASE "${database}"`);
  await admin.end();
}
