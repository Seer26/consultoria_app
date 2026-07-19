import { database } from '../../db/database';
import type {
  DashboardCompanyScoreItem,
  DashboardCompanySummary,
  DashboardMetrics,
  DashboardPillarScore,
  DashboardResearchItem,
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
    companiesTotal: row?.companiesTotal ?? undefined,
    usersTotal: row?.usersTotal ?? undefined,
    researchTotal: row?.researchTotal ?? 0,
    completedResearchTotal: row?.completedResearchTotal ?? 0,
    averageScore: roundScore(row?.averageScore),
    openTasks: row?.openTasks ?? 0,
    inProgressTasks: row?.inProgressTasks ?? undefined,
    overdueTasks: row?.overdueTasks ?? 0,
    criticalOverdueTasks: row?.criticalOverdueTasks ?? 0,
    dueSoonTasks: row?.dueSoonTasks ?? 0,
    doneTasks: row?.doneTasks ?? 0,
    assignedTasksTotal: row?.assignedTasksTotal ?? undefined,
    usersCompanyTotal: row?.usersCompanyTotal ?? undefined,
    myResearchTotal: row?.myResearchTotal ?? undefined,
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

  findCompanyById(companyId: string): CompanyRow | null {
    const row = database
      .prepare(
        `
        SELECT id, name
        FROM companies
        WHERE id = ?
        `,
      )
      .get(companyId) as CompanyRow | undefined;

    return row ?? null;
  }

  getAdminMetrics(): DashboardMetrics {
    const row = database
      .prepare(
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
      )
      .get() as MetricsRow | undefined;

    return mapMetrics(row);
  }

  getCompanyMetrics(companyId: string): DashboardMetrics {
    const row = database
      .prepare(
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
      )
      .get({ companyId }) as MetricsRow | undefined;

    return mapMetrics(row);
  }

  getEmployeeMetrics(companyId: string, userId: string): DashboardMetrics {
    const row = database
      .prepare(
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
      )
      .get({ companyId, userId }) as MetricsRow | undefined;

    return mapMetrics(row);
  }

  listRecentResearch(filters: {
    companyId?: string;
    userId?: string;
    limit: number;
  }): DashboardResearchItem[] {
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

    const rows = database
      .prepare(
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
      )
      .all(...params) as ResearchRow[];

    return rows.map(mapResearch);
  }

  getLatestCompletedResearchByCompany(companyId: string): {
    submission: DashboardResearchItem | null;
    pillarScores: DashboardPillarScore[];
  } {
    const row = database
      .prepare(
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
      )
      .get(companyId) as ResearchRow | undefined;

    if (!row) {
      return { submission: null, pillarScores: [] };
    }

    return {
      submission: mapResearch(row),
      pillarScores: parsePillarScores(row.pillar_scores),
    };
  }

  getLatestResearchByUser(userId: string): {
    submission: DashboardResearchItem | null;
    pillarScores: DashboardPillarScore[];
  } {
    const row = database
      .prepare(
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
      )
      .get(userId) as ResearchRow | undefined;

    if (!row) {
      return { submission: null, pillarScores: [] };
    }

    return {
      submission: mapResearch(row),
      pillarScores: parsePillarScores(row.pillar_scores),
    };
  }

  listRecentInsights(companyId: string, limit: number): {
    criticalPoints: string[];
    opportunities: string[];
  } {
    const rows = database
      .prepare(
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
      )
      .all(companyId) as ResearchRow[];

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

  listRecentTasks(filters: {
    companyId?: string;
    responsibleUserId?: string;
    limit: number;
    onlyOpen?: boolean;
  }): DashboardTaskItem[] {
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

    const rows = database
      .prepare(
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
      )
      .all(...params) as TaskRow[];

    return rows.map(mapTask);
  }

  listUpcomingTasks(filters: {
    companyId?: string;
    responsibleUserId?: string;
    limit: number;
  }): DashboardTaskItem[] {
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

    const rows = database
      .prepare(
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
      )
      .all(...params) as TaskRow[];

    return rows.map(mapTask);
  }

  listLowestScoreCompanies(limit: number): DashboardCompanyScoreItem[] {
    const rows = database
      .prepare(
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
      )
      .all(limit) as CompanyScoreRow[];

    return rows.map((row) => ({
      companyId: row.company_id,
      companyName: row.company_name,
      averageScore: roundScore(row.average_score),
      completedResearchTotal: row.completed_research_total ?? 0,
      usersTotal: row.users_total ?? 0,
    }));
  }

  getCompanySummary(companyId: string): DashboardCompanySummary | null {
    const company = this.findCompanyById(companyId);
    if (!company) {
      return null;
    }

    const metrics = this.getCompanyMetrics(companyId);
    return {
      id: company.id,
      name: company.name,
      averageScore: metrics.averageScore,
      openTasks: metrics.openTasks,
      overdueTasks: metrics.overdueTasks,
    };
  }
}
