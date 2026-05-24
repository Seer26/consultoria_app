import { database } from '../../db/database';
function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .trim();
}
export class DiagnosisRepository {
    saveCompany(company) {
        const timestamp = new Date().toISOString();
        const statement = database.prepare(`
      INSERT INTO companies (id, name, slug, status, sector, size, created_at, updated_at)
      VALUES (@id, @name, @slug, @status, @sector, @size, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        slug = excluded.slug,
        sector = excluded.sector,
        size = excluded.size,
        updated_at = excluded.updated_at
    `);
        statement.run({
            id: company.id,
            name: company.name,
            slug: slugify(company.name) || company.id,
            status: 'ACTIVE',
            sector: company.sector ?? null,
            size: company.size ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    }
    saveSubmission(input) {
        const timestamp = new Date().toISOString();
        const statement = database.prepare(`
      INSERT INTO diagnosis_submissions (
        id,
        company_id,
        questionnaire_id,
        submission_type,
        status,
        created_at,
        updated_at,
        completed_at
      )
      VALUES (
        @id,
        @companyId,
        @questionnaireId,
        @submissionType,
        @status,
        @createdAt,
        @updatedAt,
        @completedAt
      )
    `);
        statement.run({
            id: input.submissionId,
            companyId: input.companyId,
            questionnaireId: input.questionnaireId,
            submissionType: 'DIAGNOSIS',
            status: 'COMPLETED',
            createdAt: timestamp,
            updatedAt: timestamp,
            completedAt: timestamp,
        });
    }
    saveAnswers(submissionId, answers, questionPillars) {
        const timestamp = new Date().toISOString();
        const statement = database.prepare(`
      INSERT INTO diagnosis_answers (
        id,
        submission_id,
        question_id,
        question,
        answer,
        pillar,
        value,
        score,
        created_at
      )
      VALUES (
        @id,
        @submissionId,
        @questionId,
        @question,
        @answer,
        @pillar,
        @value,
        @score,
        @createdAt
      )
    `);
        const insertMany = database.transaction((items) => {
            for (const item of items) {
                statement.run({
                    id: `${submissionId}-${item.questionId}`,
                    submissionId,
                    questionId: item.questionId,
                    question: item.questionId,
                    answer: String(item.value),
                    pillar: questionPillars[item.questionId],
                    value: item.value,
                    score: item.value,
                    createdAt: timestamp,
                });
            }
        });
        insertMany(answers);
    }
    saveActionPlan(submissionId, tasks) {
        const statement = database.prepare(`
      INSERT INTO action_tasks (id, submission_id, pillar, title, description, priority, status)
      VALUES (@id, @submissionId, @pillar, @title, @description, @priority, @status)
    `);
        const insertMany = database.transaction((items) => {
            for (const item of items) {
                statement.run({
                    ...item,
                    submissionId,
                });
            }
        });
        insertMany(tasks);
    }
}
