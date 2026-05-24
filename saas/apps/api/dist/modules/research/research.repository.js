import { database } from '../../db/database';
function parseStringArray(value) {
    if (!value) {
        return [];
    }
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    }
    catch {
        return [];
    }
}
function parsePillarScores(value) {
    if (!value) {
        return [];
    }
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map((item) => {
            if (!item || typeof item !== 'object') {
                return null;
            }
            const candidate = item;
            return {
                pillar: String(candidate.pillar ?? ''),
                score: Number(candidate.score ?? 0),
                answersCount: Number(candidate.answersCount ?? 0),
                maturity: candidate.maturity ?? 'attention',
            };
        })
            .filter((item) => item !== null && item.pillar.length > 0);
    }
    catch {
        return [];
    }
}
function stringifyStringArray(value) {
    return JSON.stringify(value);
}
function stringifyPillarScores(value) {
    return JSON.stringify(value);
}
function mapUser(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        companyId: row.company_id,
        status: row.status,
    };
}
function mapCompany(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
    };
}
function mapSubmission(row) {
    return {
        id: row.id,
        companyId: row.company_id,
        userId: row.user_id,
        questionnaireId: row.questionnaire_id,
        submissionType: row.submission_type,
        respondentRole: row.respondent_role,
        department: row.department,
        status: row.status,
        overallScore: row.overall_score,
        summary: row.summary,
        criticalPoints: parseStringArray(row.critical_points),
        opportunities: parseStringArray(row.opportunities),
        recommendations: parseStringArray(row.recommendations),
        nextSteps: parseStringArray(row.next_steps),
        pillarScores: parsePillarScores(row.pillar_scores),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
    };
}
function mapAnswer(row) {
    return {
        id: row.id,
        submissionId: row.submission_id,
        questionId: row.question_id,
        question: row.question,
        answer: row.answer,
        pillar: row.pillar,
        value: row.value,
        score: row.score,
        createdAt: row.created_at,
    };
}
export class ResearchRepository {
    findUserById(id) {
        const row = database.prepare(`
      SELECT id, name, email, role, company_id, status
      FROM users
      WHERE id = ?
    `).get(id);
        return row ? mapUser(row) : null;
    }
    findCompanyById(id) {
        const row = database.prepare(`
      SELECT id, name, slug, status
      FROM companies
      WHERE id = ?
    `).get(id);
        return row ? mapCompany(row) : null;
    }
    createSubmission(input) {
        database.prepare(`
      INSERT INTO diagnosis_submissions (
        id,
        company_id,
        user_id,
        questionnaire_id,
        submission_type,
        respondent_role,
        department,
        status,
        overall_score,
        summary,
        critical_points,
        opportunities,
        recommendations,
        next_steps,
        pillar_scores,
        created_at,
        updated_at,
        completed_at
      )
      VALUES (
        @id,
        @companyId,
        @userId,
        @questionnaireId,
        @submissionType,
        @respondentRole,
        @department,
        @status,
        @overallScore,
        @summary,
        @criticalPoints,
        @opportunities,
        @recommendations,
        @nextSteps,
        @pillarScores,
        @createdAt,
        @updatedAt,
        @completedAt
      )
    `).run({
            ...input,
            criticalPoints: stringifyStringArray(input.criticalPoints),
            opportunities: stringifyStringArray(input.opportunities),
            recommendations: stringifyStringArray(input.recommendations),
            nextSteps: stringifyStringArray(input.nextSteps),
            pillarScores: stringifyPillarScores(input.pillarScores),
        });
        return input;
    }
    findSubmissionById(id) {
        const row = database.prepare(`
      SELECT
        id,
        company_id,
        user_id,
        questionnaire_id,
        submission_type,
        respondent_role,
        department,
        status,
        overall_score,
        summary,
        critical_points,
        opportunities,
        recommendations,
        next_steps,
        pillar_scores,
        created_at,
        updated_at,
        completed_at
      FROM diagnosis_submissions
      WHERE id = ? AND submission_type = 'RESEARCH'
    `).get(id);
        return row ? mapSubmission(row) : null;
    }
    updateSubmission(input) {
        database.prepare(`
      UPDATE diagnosis_submissions
      SET respondent_role = @respondentRole,
          department = @department,
          status = @status,
          overall_score = @overallScore,
          summary = @summary,
          critical_points = @criticalPoints,
          opportunities = @opportunities,
          recommendations = @recommendations,
          next_steps = @nextSteps,
          pillar_scores = @pillarScores,
          updated_at = @updatedAt,
          completed_at = @completedAt
      WHERE id = @id
    `).run({
            ...input,
            criticalPoints: stringifyStringArray(input.criticalPoints),
            opportunities: stringifyStringArray(input.opportunities),
            recommendations: stringifyStringArray(input.recommendations),
            nextSteps: stringifyStringArray(input.nextSteps),
            pillarScores: stringifyPillarScores(input.pillarScores),
        });
        return input;
    }
    createAnswer(input) {
        database.prepare(`
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
    `).run(input);
        return input;
    }
    listAnswersBySubmissionId(submissionId) {
        const rows = database.prepare(`
      SELECT id, submission_id, question_id, question, answer, pillar, value, score, created_at
      FROM diagnosis_answers
      WHERE submission_id = ?
      ORDER BY created_at ASC
    `).all(submissionId);
        return rows.map(mapAnswer);
    }
    getNextAnswerSequence(submissionId) {
        const row = database.prepare(`
      SELECT COUNT(*) as total
      FROM diagnosis_answers
      WHERE submission_id = ?
    `).get(submissionId);
        return Number(row?.total ?? 0) + 1;
    }
    listResearchSubmissions(input) {
        const conditions = [`ds.submission_type = 'RESEARCH'`];
        const params = [];
        if (input.companyId) {
            conditions.push(`ds.company_id = ?`);
            params.push(input.companyId);
        }
        if (input.userId) {
            conditions.push(`ds.user_id = ?`);
            params.push(input.userId);
        }
        const rows = database.prepare(`
      SELECT
        ds.id,
        ds.company_id,
        ds.user_id,
        ds.questionnaire_id,
        ds.submission_type,
        ds.respondent_role,
        ds.department,
        ds.status,
        ds.overall_score,
        ds.summary,
        ds.critical_points,
        ds.opportunities,
        ds.recommendations,
        ds.next_steps,
        ds.pillar_scores,
        ds.created_at,
        ds.updated_at,
        ds.completed_at,
        c.name as company_name,
        u.name as user_name,
        COUNT(da.id) as answers_count
      FROM diagnosis_submissions ds
      INNER JOIN companies c ON c.id = ds.company_id
      INNER JOIN users u ON u.id = ds.user_id
      LEFT JOIN diagnosis_answers da ON da.submission_id = ds.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY
        ds.id,
        ds.company_id,
        ds.user_id,
        ds.questionnaire_id,
        ds.submission_type,
        ds.respondent_role,
        ds.department,
        ds.status,
        ds.overall_score,
        ds.summary,
        ds.critical_points,
        ds.opportunities,
        ds.recommendations,
        ds.next_steps,
        ds.pillar_scores,
        ds.created_at,
        ds.updated_at,
        ds.completed_at,
        c.name,
        u.name
      ORDER BY ds.created_at DESC
    `).all(...params);
        return rows.map((row) => {
            const mapped = mapSubmission(row);
            return {
                id: row.id,
                companyId: row.company_id,
                companyName: row.company_name,
                userId: row.user_id,
                userName: row.user_name,
                respondentRole: row.respondent_role,
                department: row.department,
                status: row.status,
                overallScore: row.overall_score,
                summary: row.summary,
                criticalPoints: mapped.criticalPoints,
                opportunities: mapped.opportunities,
                recommendations: mapped.recommendations,
                nextSteps: mapped.nextSteps,
                pillarScores: mapped.pillarScores,
                answersCount: Number(row.answers_count ?? 0),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                completedAt: row.completed_at,
            };
        });
    }
}
