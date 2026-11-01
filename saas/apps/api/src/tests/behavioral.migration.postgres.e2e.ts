import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import { Client } from 'pg';

const migrationsDir = path.resolve('src/database/migrations');
const migrationFilename = '010_behavioral_assessments.sql';
assert((await fs.readdir(migrationsDir)).includes(migrationFilename), 'Missing migration 010_behavioral_assessments.sql');
const behavioralSql = await fs.readFile(path.join(migrationsDir, migrationFilename), 'utf8');

dotenv.config({ path: '.env.local', override: true, quiet: true });
const sourceUrl = process.env.DATABASE_URL?.trim();
assert(sourceUrl, 'BEHAVIORAL_MIGRATION_TEST_REQUIRES_LOCAL_POSTGRES');
const localUrl = new URL(sourceUrl);
assert(
  ['localhost', '127.0.0.1', '[::1]'].includes(localUrl.hostname)
    && localUrl.pathname === '/consultoria_local',
  'BEHAVIORAL_MIGRATION_TEST_REQUIRES_LOCAL_POSTGRES',
);
const database = `consultoria_behavioral_${process.pid}_${Date.now()}_test`;
assert(/^consultoria_behavioral_\d+_\d+_test$/.test(database));
function withDatabase(name: string) {
  const url = new URL(localUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

// Literal approved V1 fixture: catches seed omissions, changed wording and wrong inversion/dimension.
const expectedCatalog = [
  ['EXECUTOR', 'Quando surge uma pendência e ainda faltam alguns detalhes, procuro identificar o que já pode ser feito para avançar.', false],
  ['EXECUTOR', 'Em atividades longas, mantenho o ritmo ao dividir o trabalho em entregas menores.', false],
  ['EXECUTOR', 'Prefiro esperar que alguém defina todos os detalhes antes de iniciar uma tarefa sob minha responsabilidade.', true],
  ['EXECUTOR', 'Quando encontro um obstáculo durante uma tarefa, procuro uma alternativa prática para continuar avançando.', false],
  ['EXECUTOR', 'Tenho facilidade para transformar uma intenção em próximos passos concretos.', false],
  ['COMUNICADOR', 'Ao explicar um assunto, ajusto minha linguagem conforme a pessoa com quem falo.', false],
  ['COMUNICADOR', 'Em reuniões, procuro verificar se as pessoas entenderam o que foi combinado antes de avançar.', false],
  ['COMUNICADOR', 'Costumo deixar conversas importantes para depois quando antecipo opiniões diferentes.', true],
  ['COMUNICADOR', 'Consigo apresentar uma discordância de forma respeitosa e direta.', false],
  ['COMUNICADOR', 'Quando percebo que uma explicação não ficou clara, procuro apresentá-la de outra forma.', false],
  ['PLANEJADOR', 'Antes de começar uma demanda com várias etapas, organizo uma sequência de trabalho e prioridades.', false],
  ['PLANEJADOR', 'Reviso prazos e dependências quando surgem mudanças no trabalho.', false],
  ['PLANEJADOR', 'Frequentemente começo tarefas sem reservar tempo para organizar o que precisa ser feito.', true],
  ['PLANEJADOR', 'Quando há várias urgências, defino critérios para decidir o que vem primeiro.', false],
  ['PLANEJADOR', 'Costumo acompanhar se o que foi combinado está avançando como previsto.', false],
  ['ANALITICO', 'Antes de concluir algo relevante, comparo informações de fontes diferentes quando isso pode mudar a decisão.', false],
  ['ANALITICO', 'Costumo identificar padrões ao comparar resultados ocorridos em momentos diferentes.', false],
  ['ANALITICO', 'Tendo a aceitar a primeira explicação plausível sem checar outros fatores.', true],
  ['ANALITICO', 'Quando um número ou indicador parece fora do esperado, procuro entender o que pode explicá-lo.', false],
  ['ANALITICO', 'Em problemas complexos, separo fatos, hipóteses e opiniões antes de decidir.', false],
];

const administrator = new Client({ connectionString: withDatabase('postgres') });
let databaseCreated = false;
await administrator.connect();
try {
  // Never drop or reuse a pre-existing database, including the source database.
  await administrator.query(`CREATE DATABASE "${database}"`);
  databaseCreated = true;
  const client = new Client({ connectionString: withDatabase(database) });
  await client.connect();
  try {
    const prerequisiteFiles = (await fs.readdir(migrationsDir))
      .filter((name) => /^00[1-9]_.*\.sql$/.test(name)).sort();
    assert.equal(prerequisiteFiles.length, 9);
    for (const filename of prerequisiteFiles) {
      await client.query(await fs.readFile(path.join(migrationsDir, filename), 'utf8'));
    }
    await client.query(`
      INSERT INTO companies (id, name, slug, created_at, updated_at)
      VALUES ('company-a', 'Company A', 'behavioral-a', NOW()::text, NOW()::text),
             ('company-b', 'Company B', 'behavioral-b', NOW()::text, NOW()::text);
      INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at)
      VALUES ('user-a', 'User A', 'behavioral-a@example.invalid', 'hash', 'EMPLOYEE', 'company-a', NOW()::text, NOW()::text),
             ('user-b', 'User B', 'behavioral-b@example.invalid', 'hash', 'OWNER', 'company-b', NOW()::text, NOW()::text);
    `);
    await client.query(behavioralSql);
    await client.query(behavioralSql);

    const tables = await client.query<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'behavioral_%' ORDER BY table_name
    `);
    assert.deepEqual(tables.rows.map((row) => row.table_name), [
      'behavioral_answers', 'behavioral_assessments', 'behavioral_questionnaires',
      'behavioral_questions', 'behavioral_results',
    ]);
    const questionnaire = await client.query('SELECT version, active FROM behavioral_questionnaires');
    assert.deepEqual(questionnaire.rows, [{ version: 1, active: true }]);
    const catalogSql = `SELECT id, questionnaire_version, dimension, text, is_reverse, position, active
                        FROM behavioral_questions WHERE questionnaire_version = 1 ORDER BY position`;
    const catalog = await client.query(catalogSql);
    assert.equal(catalog.rows.length, 20);
    assert.deepEqual(catalog.rows.map((row) => [row.dimension, row.text, row.is_reverse]), expectedCatalog);
    assert.deepEqual(catalog.rows.map((row) => row.position), Array.from({ length: 20 }, (_, index) => index + 1));
    assert(catalog.rows.every((row) => row.questionnaire_version === 1 && row.active === true));
    const dimensions = await client.query(`
      SELECT dimension, COUNT(*)::int total, COUNT(*) FILTER (WHERE is_reverse)::int reverse
      FROM behavioral_questions WHERE questionnaire_version = 1 GROUP BY dimension ORDER BY dimension
    `);
    assert.deepEqual(dimensions.rows, [
      { dimension: 'ANALITICO', total: 5, reverse: 1 },
      { dimension: 'COMUNICADOR', total: 5, reverse: 1 },
      { dimension: 'EXECUTOR', total: 5, reverse: 1 },
      { dimension: 'PLANEJADOR', total: 5, reverse: 1 },
    ]);

    // Exercise constraints through writes; removing one must make the corresponding assertion fail.
    async function rejectsCode(sql: string, values: unknown[], code: string) {
      await assert.rejects(client.query(sql, values), (error: unknown) => (
        error instanceof Error && 'code' in error && error.code === code
      ));
    }
    const insertQuestion = `INSERT INTO behavioral_questions
      (id, questionnaire_version, dimension, text, is_reverse, position, active)
      VALUES ($1, $2, $3, 'Test question', false, $4, true)`;
    await rejectsCode(insertQuestion, ['bad-dimension', 1, 'OTHER', 21], '23514');
    await rejectsCode(insertQuestion, ['duplicate-position', 1, 'EXECUTOR', 1], '23505');
    await rejectsCode(insertQuestion, ['missing-version', 999, 'EXECUTOR', 21], '23503');

    const insertAssessment = `INSERT INTO behavioral_assessments
      (id, company_id, user_id, status, questionnaire_version, started_at, completed_at, created_at)
      VALUES ($1, $2, $3, $4, $5, '2026-11-01T10:00:00Z', $6, '2026-11-01T10:00:00Z')`;
    await client.query(insertAssessment, ['historical', 'company-a', 'user-a', 'COMPLETED', 1, '2026-11-01T11:00:00Z']);
    await client.query(insertAssessment, ['current', 'company-a', 'user-a', 'IN_PROGRESS', 1, null]);
    await client.query(insertAssessment, ['other-current', 'company-b', 'user-b', 'IN_PROGRESS', 1, null]);
    await rejectsCode(insertAssessment, ['duplicate-current', 'company-a', 'user-a', 'IN_PROGRESS', 1, null], '23505');
    await rejectsCode(insertAssessment, ['duplicate-cross-company', 'company-b', 'user-a', 'IN_PROGRESS', 1, null], '23505');
    await rejectsCode(insertAssessment, ['bad-status', 'company-a', 'user-a', 'OTHER', 1, null], '23514');
    await rejectsCode(insertAssessment, ['bad-company', 'missing', 'user-a', 'COMPLETED', 1, null], '23503');
    await rejectsCode(insertAssessment, ['bad-user', 'company-a', 'missing', 'COMPLETED', 1, null], '23503');
    await rejectsCode(insertAssessment, ['bad-version', 'company-a', 'user-a', 'COMPLETED', 999, null], '23503');

    const insertAnswer = `INSERT INTO behavioral_answers
      (id, assessment_id, question_id, value, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW()::text, NOW()::text)`;
    const questionId = catalog.rows[0].id;
    await client.query(insertAnswer, ['answer', 'current', questionId, 1]);
    await client.query(insertAnswer, ['high-answer', 'historical', questionId, 5]);
    await rejectsCode(insertAnswer, ['duplicate-answer', 'current', questionId, 3], '23505');
    await rejectsCode(insertAnswer, ['low-answer', 'current', catalog.rows[1].id, 0], '23514');
    await rejectsCode(insertAnswer, ['invalid-high-answer', 'current', catalog.rows[1].id, 6], '23514');
    await rejectsCode(insertAnswer, ['missing-assessment', 'missing', questionId, 3], '23503');
    await rejectsCode(insertAnswer, ['missing-question', 'current', 'missing', 3], '23503');

    const insertResult = `INSERT INTO behavioral_results
      (assessment_id, executor_score, comunicador_score, planejador_score, analitico_score, predominant_dimension, calculated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW()::text)`;
    await client.query(insertResult, ['historical', 0, 100, 50, 50, 'COMUNICADOR']);
    await client.query(insertResult, ['current', 50, 50, 50, 50, null]);
    await rejectsCode(insertResult, ['historical', 0, 100, 50, 50, null], '23505');
    await rejectsCode(insertResult, ['missing', 0, 100, 50, 50, null], '23503');
    for (let scoreIndex = 0; scoreIndex < 4; scoreIndex++) {
      for (const invalidScore of [-1, 101]) {
        const scores = [50, 50, 50, 50];
        scores[scoreIndex] = invalidScore;
        await rejectsCode(insertResult, ['other-current', ...scores, null], '23514');
      }
    }
    await rejectsCode(insertResult, ['other-current', 50, 50, 50, 50, 'OTHER'], '23514');

    const indexes = await client.query<{ indexdef: string }>(`
      SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename LIKE 'behavioral_%'
    `);
    assert(indexes.rows.some(({ indexdef }) => /\(questionnaire_version, "?position"?\)/.test(indexdef)));
    assert(indexes.rows.some(({ indexdef }) => /\(company_id, user_id, created_at DESC\)/.test(indexdef)));
    assert(indexes.rows.some(({ indexdef }) => /\(company_id, status\)/.test(indexdef)));
    assert(indexes.rows.some(({ indexdef }) => /UNIQUE INDEX/.test(indexdef)
      && /\(user_id\)/.test(indexdef) && /WHERE.*status.*IN_PROGRESS/.test(indexdef)));

    // Reapplication must preserve existing assessments, results and the stable seeded IDs.
    const history = await client.query('SELECT * FROM behavioral_assessments ORDER BY id');
    const answers = await client.query('SELECT * FROM behavioral_answers ORDER BY id');
    const results = await client.query('SELECT * FROM behavioral_results ORDER BY assessment_id');
    await client.query('INSERT INTO behavioral_questionnaires (version, active, created_at) VALUES (2, true, NOW()::text)');
    await client.query(insertQuestion, ['version-2-question', 2, 'EXECUTOR', 1]);
    await client.query('UPDATE behavioral_questionnaires SET active = false WHERE version = 1');
    await client.query(behavioralSql);
    assert.deepEqual((await client.query(catalogSql)).rows, catalog.rows);
    assert.deepEqual((await client.query('SELECT * FROM behavioral_assessments ORDER BY id')).rows, history.rows);
    assert.deepEqual((await client.query('SELECT * FROM behavioral_answers ORDER BY id')).rows, answers.rows);
    assert.deepEqual((await client.query('SELECT * FROM behavioral_results ORDER BY assessment_id')).rows, results.rows);
    assert.deepEqual((await client.query('SELECT version, active FROM behavioral_questionnaires ORDER BY version')).rows,
      [{ version: 1, active: false }, { version: 2, active: true }]);
    assert.equal((await client.query('SELECT COUNT(*)::int total FROM behavioral_questions WHERE questionnaire_version = 2')).rows[0].total, 1);
    console.log(JSON.stringify({ ok: true, tables: 5, v1Questions: 20, dimensions: 4, reverseItems: 4,
      idempotent: true, constraints: true, indexes: true, historyPreserved: true }));
  } finally {
    await client.end();
  }
} finally {
  if (databaseCreated) await administrator.query(`DROP DATABASE "${database}"`);
  await administrator.end();
}
