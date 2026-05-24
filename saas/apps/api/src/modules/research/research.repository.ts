import { database } from '../../db/database';
import type {
  AuthenticatedUserRecord,
  CompanyRecord,
  ResearchAnswerRecord,
  ResearchListItem,
  ResearchPillarScore,
  ResearchSubmissionRecord,
} from './research.types';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  company_id: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface SubmissionRow {
  id: string;
  company_id: string;
  user_id: string;
  questionnaire_id: string;
  submission_type: 'RESEARCH';
  respondent_role: string;
  department: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  overall_score: number | null;
  summary: string | null;
  critical_points: string | null;
  opportunities: string | null;
  recommendations: string | null;
  next_steps: string | null;
  pillar_scores: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface AnswerRow {
  id: string;
  submission_id: string;
  question_id: string;
  question: string;
  answer: string;
  pillar: string | null;
  value: number | null;
  score: number | null;
  created_at: string;
}

interface SubmissionListRow extends SubmissionRow {
  company_name: string;
  user_name: string;
  answers_count: number;
}

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parsePillarScores(value: string | null): ResearchPillarScore[] {
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

        const candidate = item as Record<string, unknown>;
        return {
          pillar: String(candidate.pillar ?? ''),
          score: Number(candidate.score ?? 0),
          answersCount: Number(candidate.answersCount ?? 0),
          maturity: (candidate.maturity as ResearchPillarScore['maturity']) ?? 'attention',
        };
      })
      .filter((item): item is ResearchPillarScore => item !== null && item.pillar.length > 0);
  } catch {
    return [];
  }
}

function stringifyStringArray(value: string[]): string {
  return JSON.stringify(value);
}

function stringifyPillarScores(value: ResearchPillarScore[]): string {
  return JSON.stringify(value);
}

function mapUser(row: UserRow): AuthenticatedUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    companyId: row.company_id,
    status: row.status,
  };
}

function mapCompany(row: CompanyRow): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
  };
}

function mapSubmission(row: SubmissionRow): ResearchSubmissionRecord {
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

function mapAnswer(row: AnswerRow): ResearchAnswerRecord {
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
  findUserById(id: string): AuthenticatedUserRecord | null {
    const row = database.prepare(`
      SELECT id, name, email, role, company_id, status
      FROM users
      WHERE id = ?
    `).get(id) as UserRow | undefined;

    return row ? mapUser(row) : null;
  }

  findCompanyById(id: string): CompanyRecord | null {
    const row = database.prepare(`
      SELECT id, name, slug, status
      FROM companies
      WHERE id = ?
    `).get(id) as CompanyRow | undefined;

    return row ? mapCompany(row) : null;
  }

  createSubmission(input: ResearchSubmissionRecord): ResearchSubmissionRecord {
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

  findSubmissionById(id: string): ResearchSubmissionRecord | null {
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
    `).get(id) as SubmissionRow | undefined;

    return row ? mapSubmission(row) : null;
  }

  updateSubmission(input: ResearchSubmissionRecord): ResearchSubmissionRecord {
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

  createAnswer(input: ResearchAnswerRecord): ResearchAnswerRecord {
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

  listAnswersBySubmissionId(submissionId: string): ResearchAnswerRecord[] {
    const rows = database.prepare(`
      SELECT id, submission_id, question_id, question, answer, pillar, value, score, created_at
      FROM diagnosis_answers
      WHERE submission_id = ?
      ORDER BY created_at ASC
    `).all(submissionId) as AnswerRow[];

    return rows.map(mapAnswer);
  }

  getNextAnswerSequence(submissionId: string): number {
    const row = database.prepare(`
      SELECT COUNT(*) as total
      FROM diagnosis_answers
      WHERE submission_id = ?
    `).get(submissionId) as { total: number } | undefined;

    return Number(row?.total ?? 0) + 1;
  }

  listResearchSubmissions(input: {
    companyId?: string;
    userId?: string;
  }): ResearchListItem[] {
    const conditions = [`ds.submission_type = 'RESEARCH'`];
    const params: Array<string> = [];

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
    `).all(...params) as SubmissionListRow[];

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
