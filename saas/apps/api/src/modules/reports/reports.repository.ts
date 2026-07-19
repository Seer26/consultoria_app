import { dataSource } from '../../database/data-source';

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
  async findUserById(userId: string): Promise<UserRow | null> {
    const row = await dataSource.one<UserRow>(
        `
        SELECT id, role, company_id, status
        FROM users
        WHERE id = ?
        `,
      [userId],
    );

    return row ?? null;
  }

  async listCompletedResearchReports(filters: {
    companyId?: string;
    userId?: string;
  }): Promise<ReportSummaryRow[]> {
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

    return dataSource.many<ReportSummaryRow>(
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
      params,
    );
  }

  async findExecutiveReportBySubmissionId(
    submissionId: string,
  ): Promise<ExecutiveReportRow | null> {
    const row = await dataSource.one<ExecutiveReportRow>(
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
      [submissionId],
    );

    return row ?? null;
  }

  async listTasksBySubmissionId(submissionId: string): Promise<TaskRow[]> {
    return dataSource.many<TaskRow>(
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
      [submissionId],
    );
  }
}
