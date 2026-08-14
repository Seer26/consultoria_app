import { dataSource } from '../../database/data-source';
import type {
  DashboardCompanyScoreItem,
  DashboardCompanySummary,
  DashboardMetrics,
  DashboardOnboardingProgress,
  DashboardPillarScore,
  DashboardResearchItem,
  DashboardStrategySummary,
  DashboardTaskItem,
} from './dashboard.types';

interface UserRow {
  id: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  company_id: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

interface CompanyRow {
  id: string;
  name: string;
}

interface MetricsRow {
  companiesTotal?: number | null;
  usersTotal?: number | null;
  researchTotal: number | null;
  completedResearchTotal: number | null;
  averageScore: number | null;
  openTasks: number | null;
  inProgressTasks?: number | null;
  overdueTasks: number | null;
  criticalOverdueTasks: number | null;
  dueSoonTasks: number | null;
  doneTasks: number | null;
  assignedTasksTotal?: number | null;
  usersCompanyTotal?: number | null;
  myResearchTotal?: number | null;
}

interface ResearchRow {
  id: string;
  company_id: string;
  company_name: string | null;
  user_id: string | null;
  user_name: string | null;
  respondent_role: string | null;
  department: string | null;
  status: string;
  overall_score: number | null;
  created_at: string;
  completed_at: string | null;
  pillar_scores: string | null;
  critical_points: string | null;
  opportunities: string | null;
}

interface TaskRow {
  id: string;
  company_id: string;
  company_name: string | null;
  submission_id: string | null;
  title: string;
  pillar: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  source: string;
  responsible_user_id: string | null;
  responsible_user_name: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyScoreRow {
  company_id: string;
  company_name: string;
  average_score: number | null;
  completed_research_total: number | null;
  users_total: number | null;
}

interface OnboardingRow {
  company_profile_complete: number;
  employee_total: number;
  incomplete_profile_total: number;
  research_total: number;
  completed_research_total: number;
  action_plan_total: number;
  strategy_defined: number;
}

function roundScore(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parsePillarScores(value: string | null): DashboardPillarScore[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        pillar: String(item.pillar ?? ''),
        score: typeof item.score === 'number' ? item.score : Number(item.score ?? 0),
        answersCount:
          typeof item.answersCount === 'number'
            ? item.answersCount
            : Number(item.answersCount ?? 0),
        maturity: item.maturity == null ? undefined : String(item.maturity),
      }))
      .filter((item) => item.pillar.trim().length > 0);
  } catch {
    return [];
  }
}

function mapMetrics(row: MetricsRow | undefined): DashboardMetrics {
  return {
    companiesTotal: row?.companiesTotal == null ? undefined : Number(row.companiesTotal),
    usersTotal: row?.usersTotal == null ? undefined : Number(row.usersTotal),
    researchTotal: Number(row?.researchTotal ?? 0),
    completedResearchTotal: Number(row?.completedResearchTotal ?? 0),
    averageScore: roundScore(row?.averageScore == null ? null : Number(row.averageScore)),
    openTasks: Number(row?.openTasks ?? 0),
    inProgressTasks:
      row?.inProgressTasks == null ? undefined : Number(row.inProgressTasks),
    overdueTasks: Number(row?.overdueTasks ?? 0),
    criticalOverdueTasks: Number(row?.criticalOverdueTasks ?? 0),
    dueSoonTasks: Number(row?.dueSoonTasks ?? 0),
    doneTasks: Number(row?.doneTasks ?? 0),
    assignedTasksTotal:
      row?.assignedTasksTotal == null ? undefined : Number(row.assignedTasksTotal),
    usersCompanyTotal:
      row?.usersCompanyTotal == null ? undefined : Number(row.usersCompanyTotal),
    myResearchTotal:
      row?.myResearchTotal == null ? undefined : Number(row.myResearchTotal),
  };
}

function mapResearch(row: ResearchRow): DashboardResearchItem {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    userId: row.user_id,
    userName: row.user_name,
    respondentRole: row.respondent_role,
    department: row.department,
    status: row.status,
    overallScore: roundScore(row.overall_score),
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapTask(row: TaskRow): DashboardTaskItem {
  const due = row.due_date ? new Date(row.due_date) : null;
  const now = new Date();
  const oneDay = 86_400_000;
  const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueDay =
    due && !Number.isNaN(due.getTime())
      ? Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
      : null;
  const daysDifference = dueDay == null ? null : Math.round((dueDay - todayDay) / oneDay);
  const active = row.status !== 'DONE' && row.status !== 'CANCELED';

  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    submissionId: row.submission_id,
    title: row.title,
    pillar: row.pillar,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    source: row.source,
    responsibleUserId: row.responsible_user_id,
    responsibleUserName: row.responsible_user_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOverdue: active && daysDifference != null && daysDifference < 0,
    daysOverdue:
      active && daysDifference != null && daysDifference < 0
        ? Math.abs(daysDifference)
        : 0,
    isDueSoon:
      active && daysDifference != null && daysDifference >= 0 && daysDifference <= 7,
  };
}

export class DashboardRepository {
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

  async findCompanyById(companyId: string): Promise<CompanyRow | null> {
    const row = await dataSource.one<CompanyRow>(
        `
        SELECT id, name
        FROM companies
        WHERE id = ?
        `,
      [companyId],
    );

    return row ?? null;
  }

  async getCompanyOnboarding(companyId: string): Promise<DashboardOnboardingProgress> {
    const row = await dataSource.one<OnboardingRow>(
      `
      SELECT
        CASE
          WHEN TRIM(COALESCE(c.name, '')) <> ''
            AND TRIM(COALESCE(c.sector, '')) <> ''
            AND TRIM(COALESCE(c.size, '')) <> ''
            AND TRIM(COALESCE(c.phone, '')) <> ''
            AND TRIM(COALESCE(c.responsible_name, '')) <> ''
          THEN 1 ELSE 0
        END AS company_profile_complete,
        (
          SELECT COUNT(*) FROM users u
          WHERE u.company_id = c.id AND u.role = 'EMPLOYEE' AND u.status = 'ACTIVE'
        ) AS employee_total,
        (
          SELECT COUNT(*) FROM users u
          WHERE u.company_id = c.id
            AND u.role = 'EMPLOYEE'
            AND u.status = 'ACTIVE'
            AND (
              TRIM(COALESCE(u.department, '')) = ''
              OR TRIM(COALESCE(u.job_function, '')) = ''
            )
        ) AS incomplete_profile_total,
        (
          SELECT COUNT(*) FROM diagnosis_submissions ds
          WHERE ds.company_id = c.id AND ds.submission_type = 'RESEARCH'
        ) AS research_total,
        (
          SELECT COUNT(*) FROM diagnosis_submissions ds
          WHERE ds.company_id = c.id
            AND ds.submission_type = 'RESEARCH'
            AND ds.status = 'COMPLETED'
        ) AS completed_research_total,
        (
          SELECT COUNT(*) FROM action_plan_tasks apt
          WHERE apt.company_id = c.id AND apt.submission_id IS NOT NULL
        ) AS action_plan_total,
        CASE WHEN
          EXISTS (
            SELECT 1 FROM company_strategy cs
            WHERE cs.company_id = c.id
              AND TRIM(COALESCE(cs.mission, '')) <> ''
              AND TRIM(COALESCE(cs.vision, '')) <> ''
          )
          AND EXISTS (
            SELECT 1 FROM strategic_objectives so WHERE so.company_id = c.id
          )
          THEN 1 ELSE 0 END AS strategy_defined
      FROM companies c
      WHERE c.id = ?
      `,
      [companyId],
    );

    const employeeTotal = Number(row?.employee_total ?? 0);
    const items = {
      companyProfile: Number(row?.company_profile_complete ?? 0) === 1,
      team: employeeTotal > 0,
      professionalProfiles:
        employeeTotal > 0 && Number(row?.incomplete_profile_total ?? 0) === 0,
      firstResearch: Number(row?.research_total ?? 0) > 0,
      firstResult: Number(row?.completed_research_total ?? 0) > 0,
      firstActionPlan: Number(row?.action_plan_total ?? 0) > 0,
      strategyDefined: Number(row?.strategy_defined ?? 0) === 1,
    };
    const completedCount = Object.values(items).filter(Boolean).length;
    const totalCount = Object.keys(items).length;

    return {
      completedCount,
      totalCount,
      progress: Math.round((completedCount / totalCount) * 100),
      isComplete: completedCount === totalCount,
      items,
    };
  }

  async getStrategySummary(companyId: string): Promise<DashboardStrategySummary> {
    const now = new Date();
    const limit = new Date(now.getTime() + 30 * 86_400_000);
    const row = await dataSource.one<{
      active_objectives: number | null;
      total_objectives: number | null;
      completed_objectives: number | null;
      goals_due_soon: number | null;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM strategic_objectives WHERE company_id=@companyId AND status IN ('PLANNED','IN_PROGRESS')) AS active_objectives,
        (SELECT COUNT(*) FROM strategic_objectives WHERE company_id=@companyId) AS total_objectives,
        (SELECT COUNT(*) FROM strategic_objectives WHERE company_id=@companyId AND status='COMPLETED') AS completed_objectives,
        (SELECT COUNT(*) FROM strategic_goals WHERE company_id=@companyId AND status NOT IN ('COMPLETED','CANCELED') AND due_date BETWEEN @now AND @limit) AS goals_due_soon`,
      { companyId, now: now.toISOString(), limit: limit.toISOString() },
    );
    const total = Number(row?.total_objectives ?? 0);
    const completed = Number(row?.completed_objectives ?? 0);
    return {
      activeObjectives: Number(row?.active_objectives ?? 0),
      goalsDueSoon: Number(row?.goals_due_soon ?? 0),
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }

  async getAdminMetrics(): Promise<DashboardMetrics> {
    const row = await dataSource.one<MetricsRow>(
        `
        SELECT
          (SELECT COUNT(*) FROM companies) AS companiesTotal,
          (SELECT COUNT(*) FROM users) AS usersTotal,
          (SELECT COUNT(*) FROM diagnosis_submissions WHERE submission_type = 'RESEARCH') AS researchTotal,
          (
            SELECT COUNT(*)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH' AND status = 'COMPLETED'
          ) AS completedResearchTotal,
          (
            SELECT AVG(overall_score)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH'
              AND status = 'COMPLETED'
              AND overall_score IS NOT NULL
          ) AS averageScore,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE status NOT IN ('DONE', 'CANCELED')
          ) AS openTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE due_date IS NOT NULL
              AND julianday(due_date) < julianday('now')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS overdueTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE priority = 'CRITICAL'
              AND due_date IS NOT NULL
              AND date(due_date) < date('now')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS criticalOverdueTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE due_date IS NOT NULL
              AND date(due_date) BETWEEN date('now') AND date('now', '+7 days')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS dueSoonTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE status = 'DONE'
          ) AS doneTasks
        `,
    );

    return mapMetrics(row);
  }

  async getCompanyMetrics(companyId: string): Promise<DashboardMetrics> {
    const row = await dataSource.one<MetricsRow>(
        `
        SELECT
          (
            SELECT COUNT(*)
            FROM users
            WHERE company_id = @companyId
          ) AS usersCompanyTotal,
          (
            SELECT COUNT(*)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH'
              AND company_id = @companyId
          ) AS researchTotal,
          (
            SELECT COUNT(*)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH'
              AND company_id = @companyId
              AND status = 'COMPLETED'
          ) AS completedResearchTotal,
          (
            SELECT AVG(overall_score)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH'
              AND company_id = @companyId
              AND status = 'COMPLETED'
              AND overall_score IS NOT NULL
          ) AS averageScore,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE company_id = @companyId
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS openTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE company_id = @companyId
              AND status = 'IN_PROGRESS'
          ) AS inProgressTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE company_id = @companyId
              AND due_date IS NOT NULL
              AND julianday(due_date) < julianday('now')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS overdueTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE company_id = @companyId
              AND priority = 'CRITICAL'
              AND due_date IS NOT NULL
              AND date(due_date) < date('now')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS criticalOverdueTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE company_id = @companyId
              AND due_date IS NOT NULL
              AND date(due_date) BETWEEN date('now') AND date('now', '+7 days')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS dueSoonTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE company_id = @companyId
              AND status = 'DONE'
          ) AS doneTasks
        `,
      { companyId },
    );

    return mapMetrics(row);
  }

  async getEmployeeMetrics(
    companyId: string,
    userId: string,
  ): Promise<DashboardMetrics> {
    const row = await dataSource.one<MetricsRow>(
        `
        SELECT
          (
            SELECT COUNT(*)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH'
              AND user_id = @userId
          ) AS myResearchTotal,
          (
            SELECT COUNT(*)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH'
              AND company_id = @companyId
          ) AS researchTotal,
          (
            SELECT COUNT(*)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH'
              AND user_id = @userId
              AND status = 'COMPLETED'
          ) AS completedResearchTotal,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE responsible_user_id = @userId
          ) AS assignedTasksTotal,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE responsible_user_id = @userId
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS openTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE responsible_user_id = @userId
              AND status = 'IN_PROGRESS'
          ) AS inProgressTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE responsible_user_id = @userId
              AND due_date IS NOT NULL
              AND julianday(due_date) < julianday('now')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS overdueTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE responsible_user_id = @userId
              AND priority = 'CRITICAL'
              AND due_date IS NOT NULL
              AND date(due_date) < date('now')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS criticalOverdueTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE responsible_user_id = @userId
              AND due_date IS NOT NULL
              AND date(due_date) BETWEEN date('now') AND date('now', '+7 days')
              AND status NOT IN ('DONE', 'CANCELED')
          ) AS dueSoonTasks,
          (
            SELECT COUNT(*)
            FROM action_plan_tasks
            WHERE responsible_user_id = @userId
              AND status = 'DONE'
          ) AS doneTasks,
          (
            SELECT AVG(overall_score)
            FROM diagnosis_submissions
            WHERE submission_type = 'RESEARCH'
              AND user_id = @userId
              AND status = 'COMPLETED'
              AND overall_score IS NOT NULL
          ) AS averageScore
        `,
      { companyId, userId },
    );

    return mapMetrics(row);
  }

  async listRecentResearch(filters: {
    companyId?: string;
    userId?: string;
    limit: number;
  }): Promise<DashboardResearchItem[]> {
    const conditions = [`ds.submission_type = 'RESEARCH'`];
    const params: Array<string | number> = [];

    if (filters.companyId) {
      conditions.push('ds.company_id = ?');
      params.push(filters.companyId);
    }

    if (filters.userId) {
      conditions.push('ds.user_id = ?');
      params.push(filters.userId);
    }

    params.push(filters.limit);

    const rows = await dataSource.many<ResearchRow>(
        `
        SELECT
          ds.id,
          ds.company_id,
          c.name AS company_name,
          ds.user_id,
          u.name AS user_name,
          ds.respondent_role,
          ds.department,
          ds.status,
          ds.overall_score,
          ds.created_at,
          ds.completed_at,
          ds.pillar_scores,
          ds.critical_points,
          ds.opportunities
        FROM diagnosis_submissions ds
        INNER JOIN companies c ON c.id = ds.company_id
        LEFT JOIN users u ON u.id = ds.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY COALESCE(ds.completed_at, ds.created_at) DESC
        LIMIT ?
        `,
      params,
    );

    return rows.map(mapResearch);
  }

  async getLatestCompletedResearchByCompany(companyId: string): Promise<{
    submission: DashboardResearchItem | null;
    pillarScores: DashboardPillarScore[];
  }> {
    const row = await dataSource.one<ResearchRow>(
        `
        SELECT
          ds.id,
          ds.company_id,
          c.name AS company_name,
          ds.user_id,
          u.name AS user_name,
          ds.respondent_role,
          ds.department,
          ds.status,
          ds.overall_score,
          ds.created_at,
          ds.completed_at,
          ds.pillar_scores,
          ds.critical_points,
          ds.opportunities
        FROM diagnosis_submissions ds
        INNER JOIN companies c ON c.id = ds.company_id
        LEFT JOIN users u ON u.id = ds.user_id
        WHERE ds.submission_type = 'RESEARCH'
          AND ds.company_id = ?
          AND ds.status = 'COMPLETED'
        ORDER BY COALESCE(ds.completed_at, ds.created_at) DESC
        LIMIT 1
        `,
      [companyId],
    );

    if (!row) {
      return { submission: null, pillarScores: [] };
    }

    return {
      submission: mapResearch(row),
      pillarScores: parsePillarScores(row.pillar_scores),
    };
  }

  async getLatestResearchByUser(userId: string): Promise<{
    submission: DashboardResearchItem | null;
    pillarScores: DashboardPillarScore[];
  }> {
    const row = await dataSource.one<ResearchRow>(
        `
        SELECT
          ds.id,
          ds.company_id,
          c.name AS company_name,
          ds.user_id,
          u.name AS user_name,
          ds.respondent_role,
          ds.department,
          ds.status,
          ds.overall_score,
          ds.created_at,
          ds.completed_at,
          ds.pillar_scores,
          ds.critical_points,
          ds.opportunities
        FROM diagnosis_submissions ds
        INNER JOIN companies c ON c.id = ds.company_id
        LEFT JOIN users u ON u.id = ds.user_id
        WHERE ds.submission_type = 'RESEARCH'
          AND ds.user_id = ?
        ORDER BY COALESCE(ds.completed_at, ds.created_at) DESC
        LIMIT 1
        `,
      [userId],
    );

    if (!row) {
      return { submission: null, pillarScores: [] };
    }

    return {
      submission: mapResearch(row),
      pillarScores: parsePillarScores(row.pillar_scores),
    };
  }

  async listRecentInsights(companyId: string, limit: number): Promise<{
    criticalPoints: string[];
    opportunities: string[];
  }> {
    const rows = await dataSource.many<ResearchRow>(
        `
        SELECT
          ds.id,
          ds.company_id,
          c.name AS company_name,
          ds.user_id,
          u.name AS user_name,
          ds.respondent_role,
          ds.department,
          ds.status,
          ds.overall_score,
          ds.created_at,
          ds.completed_at,
          ds.pillar_scores,
          ds.critical_points,
          ds.opportunities
        FROM diagnosis_submissions ds
        INNER JOIN companies c ON c.id = ds.company_id
        LEFT JOIN users u ON u.id = ds.user_id
        WHERE ds.submission_type = 'RESEARCH'
          AND ds.company_id = ?
          AND ds.status = 'COMPLETED'
        ORDER BY COALESCE(ds.completed_at, ds.created_at) DESC
        LIMIT 3
        `,
      [companyId],
    );

    const criticalPoints = new Set<string>();
    const opportunities = new Set<string>();

    for (const row of rows) {
      for (const item of parseStringArray(row.critical_points)) {
        if (criticalPoints.size < limit) {
          criticalPoints.add(item);
        }
      }

      for (const item of parseStringArray(row.opportunities)) {
        if (opportunities.size < limit) {
          opportunities.add(item);
        }
      }
    }

    return {
      criticalPoints: [...criticalPoints],
      opportunities: [...opportunities],
    };
  }

  async listRecentTasks(filters: {
    companyId?: string;
    responsibleUserId?: string;
    limit: number;
    onlyOpen?: boolean;
  }): Promise<DashboardTaskItem[]> {
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (filters.companyId) {
      conditions.push('apt.company_id = ?');
      params.push(filters.companyId);
    }

    if (filters.responsibleUserId) {
      conditions.push('apt.responsible_user_id = ?');
      params.push(filters.responsibleUserId);
    }

    if (filters.onlyOpen) {
      conditions.push(`apt.status NOT IN ('DONE', 'CANCELED')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(filters.limit);

    const rows = await dataSource.many<TaskRow>(
        `
        SELECT
          apt.id,
          apt.company_id,
          c.name AS company_name,
          apt.submission_id,
          apt.title,
          apt.pillar,
          apt.priority,
          apt.status,
          apt.due_date,
          apt.source,
          apt.responsible_user_id,
          u.name AS responsible_user_name,
          apt.created_at,
          apt.updated_at
        FROM action_plan_tasks apt
        INNER JOIN companies c ON c.id = apt.company_id
        LEFT JOIN users u ON u.id = apt.responsible_user_id
        ${whereClause}
        ORDER BY apt.created_at DESC
        LIMIT ?
        `,
      params,
    );

    return rows.map(mapTask);
  }

  async listUpcomingTasks(filters: {
    companyId?: string;
    responsibleUserId?: string;
    limit: number;
  }): Promise<DashboardTaskItem[]> {
    const conditions = [`apt.status NOT IN ('DONE', 'CANCELED')`];
    const params: Array<string | number> = [];

    if (filters.companyId) {
      conditions.push('apt.company_id = ?');
      params.push(filters.companyId);
    }

    if (filters.responsibleUserId) {
      conditions.push('apt.responsible_user_id = ?');
      params.push(filters.responsibleUserId);
    }

    params.push(filters.limit);

    const rows = await dataSource.many<TaskRow>(
        `
        SELECT
          apt.id,
          apt.company_id,
          c.name AS company_name,
          apt.submission_id,
          apt.title,
          apt.pillar,
          apt.priority,
          apt.status,
          apt.due_date,
          apt.source,
          apt.responsible_user_id,
          u.name AS responsible_user_name,
          apt.created_at,
          apt.updated_at
        FROM action_plan_tasks apt
        INNER JOIN companies c ON c.id = apt.company_id
        LEFT JOIN users u ON u.id = apt.responsible_user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY
          CASE WHEN apt.due_date IS NULL THEN 1 ELSE 0 END,
          apt.due_date ASC,
          apt.created_at DESC
        LIMIT ?
        `,
      params,
    );

    return rows.map(mapTask);
  }

  async listLowestScoreCompanies(limit: number): Promise<DashboardCompanyScoreItem[]> {
    const rows = await dataSource.many<CompanyScoreRow>(
        `
        SELECT
          c.id AS company_id,
          c.name AS company_name,
          AVG(ds.overall_score) AS average_score,
          COUNT(ds.id) AS completed_research_total,
          (
            SELECT COUNT(*)
            FROM users u
            WHERE u.company_id = c.id
          ) AS users_total
        FROM companies c
        INNER JOIN diagnosis_submissions ds
          ON ds.company_id = c.id
         AND ds.submission_type = 'RESEARCH'
         AND ds.status = 'COMPLETED'
         AND ds.overall_score IS NOT NULL
        GROUP BY c.id, c.name
        ORDER BY AVG(ds.overall_score) ASC, c.name ASC
        LIMIT ?
        `,
      [limit],
    );

    return rows.map((row) => ({
      companyId: row.company_id,
      companyName: row.company_name,
      averageScore: roundScore(row.average_score),
      completedResearchTotal: row.completed_research_total ?? 0,
      usersTotal: row.users_total ?? 0,
    }));
  }

  async getCompanySummary(companyId: string): Promise<DashboardCompanySummary | null> {
    const company = await this.findCompanyById(companyId);
    if (!company) {
      return null;
    }

    const metrics = await this.getCompanyMetrics(companyId);
    return {
      id: company.id,
      name: company.name,
      averageScore: metrics.averageScore,
      openTasks: metrics.openTasks,
      overdueTasks: metrics.overdueTasks,
    };
  }
}
