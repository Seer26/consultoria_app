import { database } from '../../db/database';

interface UserRow {
  id: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  company_id: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ReportSummaryRow {
  submission_id: string;
  company_id: string;
  company_name: string;
  respondent_name: string | null;
  respondent_role: string | null;
  department: string | null;
  completed_at: string | null;
  overall_score: number | null;
  action_plan_generated: number;
}

interface ExecutiveReportRow {
  submission_id: string;
  company_id: string;
  company_name: string;
  company_status: string;
  respondent_name: string | null;
  respondent_email: string | null;
  respondent_role: string | null;
  department: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  overall_score: number | null;
  summary: string | null;
  pillar_scores: string | null;
  critical_points: string | null;
  opportunities: string | null;
  recommendations: string | null;
  next_steps: string | null;
  user_id: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  pillar: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  responsible_user_name: string | null;
  responsible_user_email: string | null;
  source: string;
}

export class ReportsRepository {
  findUserById(userId: string): UserRow | null {
    const row = database
      .prepare(
        `
        SELECT id, role, company_id, status
        FROM users
        WHERE id = ?
        `,
      )
      .get(userId) as UserRow | undefined;

    return row ?? null;
  }

  listCompletedResearchReports(filters: {
    companyId?: string;
    userId?: string;
  }): ReportSummaryRow[] {
    const conditions = [`ds.submission_type = 'RESEARCH'`, `ds.status = 'COMPLETED'`];
    const params: string[] = [];

    if (filters.companyId) {
      conditions.push('ds.company_id = ?');
      params.push(filters.companyId);
    }

    if (filters.userId) {
      conditions.push('ds.user_id = ?');
      params.push(filters.userId);
    }

    return database
      .prepare(
        `
        SELECT
          ds.id AS submission_id,
          ds.company_id,
          c.name AS company_name,
          u.name AS respondent_name,
          ds.respondent_role,
          ds.department,
          ds.completed_at,
          ds.overall_score,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM action_plan_tasks apt
              WHERE apt.submission_id = ds.id
            ) THEN 1
            ELSE 0
          END AS action_plan_generated
        FROM diagnosis_submissions ds
        INNER JOIN companies c ON c.id = ds.company_id
        LEFT JOIN users u ON u.id = ds.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY COALESCE(ds.completed_at, ds.created_at) DESC
        `,
      )
      .all(...params) as ReportSummaryRow[];
  }

  findExecutiveReportBySubmissionId(submissionId: string): ExecutiveReportRow | null {
    const row = database
      .prepare(
        `
        SELECT
          ds.id AS submission_id,
          ds.company_id,
          c.name AS company_name,
          c.status AS company_status,
          u.name AS respondent_name,
          u.email AS respondent_email,
          ds.respondent_role,
          ds.department,
          ds.status,
          ds.created_at,
          ds.completed_at,
          ds.overall_score,
          ds.summary,
          ds.pillar_scores,
          ds.critical_points,
          ds.opportunities,
          ds.recommendations,
          ds.next_steps,
          ds.user_id
        FROM diagnosis_submissions ds
        INNER JOIN companies c ON c.id = ds.company_id
        LEFT JOIN users u ON u.id = ds.user_id
        WHERE ds.id = ?
          AND ds.submission_type = 'RESEARCH'
        LIMIT 1
        `,
      )
      .get(submissionId) as ExecutiveReportRow | undefined;

    return row ?? null;
  }

  listTasksBySubmissionId(submissionId: string): TaskRow[] {
    return database
      .prepare(
        `
        SELECT
          apt.id,
          apt.title,
          apt.description,
          apt.pillar,
          apt.priority,
          apt.status,
          apt.due_date,
          u.name AS responsible_user_name,
          u.email AS responsible_user_email,
          apt.source
        FROM action_plan_tasks apt
        LEFT JOIN users u ON u.id = apt.responsible_user_id
        WHERE apt.submission_id = ?
        ORDER BY
          CASE apt.priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            ELSE 4
          END,
          CASE apt.status
            WHEN 'TODO' THEN 1
            WHEN 'IN_PROGRESS' THEN 2
            WHEN 'DONE' THEN 3
            ELSE 4
          END,
          COALESCE(apt.due_date, apt.created_at) ASC
        `,
      )
      .all(submissionId) as TaskRow[];
  }
}
