import { dataSource } from '../../database/data-source';
import type {
  ActionPlanAssignee,
  ActionPlanCompanyRecord,
  ActionPlanTaskDetails,
  ActionPlanTaskRecord,
  AuthenticatedActionPlanUser,
} from './action-plan.types';

interface AssigneeRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  company_id: string;
  job_role: string | null;
  department: string | null;
  company_sector: string | null;
}

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
  status: 'IN_PROGRESS' | 'COMPLETED';
}

interface ActionPlanTaskRow {
  id: string;
  company_id: string;
  submission_id: string | null;
  title: string;
  description: string;
  pillar: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
  due_date: string | null;
  responsible_user_id: string | null;
  source: 'RESEARCH_RECOMMENDATION' | 'MANUAL' | 'AI';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface ActionPlanTaskDetailsRow extends ActionPlanTaskRow {
  company_name: string | null;
  responsible_user_name: string | null;
  responsible_user_email: string | null;
}

function mapUser(row: UserRow): AuthenticatedActionPlanUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    companyId: row.company_id,
    status: row.status,
  };
}

function mapCompany(row: CompanyRow): ActionPlanCompanyRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
  };
}

function mapTask(row: ActionPlanTaskRow): ActionPlanTaskRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    submissionId: row.submission_id,
    title: row.title,
    description: row.description,
    pillar: row.pillar,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    responsibleUserId: row.responsible_user_id,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function mapTaskDetails(row: ActionPlanTaskDetailsRow): ActionPlanTaskDetails {
  return {
    ...mapTask(row),
    companyName: row.company_name,
    responsibleUserName: row.responsible_user_name,
    responsibleUserEmail: row.responsible_user_email,
    isOverdue: false,
    daysOverdue: 0,
    isDueSoon: false,
  };
}

export class ActionPlanRepository {
  async listActiveAssignees(companyId: string): Promise<ActionPlanAssignee[]> {
    const rows = await dataSource.many<AssigneeRow>(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.company_id,
          (
            SELECT ds.respondent_role
            FROM diagnosis_submissions ds
            WHERE ds.user_id = u.id
              AND ds.company_id = u.company_id
              AND ds.respondent_role IS NOT NULL
              AND TRIM(ds.respondent_role) <> ''
            ORDER BY ds.created_at DESC
            LIMIT 1
          ) AS job_role,
          (
            SELECT ds.department
            FROM diagnosis_submissions ds
            WHERE ds.user_id = u.id
              AND ds.company_id = u.company_id
              AND ds.department IS NOT NULL
              AND TRIM(ds.department) <> ''
            ORDER BY ds.created_at DESC
            LIMIT 1
          ) AS department,
          c.sector AS company_sector
        FROM users u
        INNER JOIN companies c ON c.id = u.company_id
        WHERE u.company_id = ?
          AND u.status = 'ACTIVE'
        ORDER BY
          CASE u.role WHEN 'OWNER' THEN 1 ELSE 2 END,
          u.name ASC
        `,
      [companyId],
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      jobRole:
        row.job_role?.trim() ||
        (row.role === 'OWNER' ? 'Responsável pela empresa' : 'Colaborador'),
      department: row.department?.trim() || row.company_sector?.trim() || 'Não informado',
      companyId: row.company_id,
    }));
  }

  async findUserById(id: string): Promise<AuthenticatedActionPlanUser | null> {
    const row = await dataSource.one<UserRow>(
        `
        SELECT id, name, email, role, company_id, status
        FROM users
        WHERE id = ?
        `,
      [id],
    );

    return row ? mapUser(row) : null;
  }

  async findCompanyById(id: string): Promise<ActionPlanCompanyRecord | null> {
    const row = await dataSource.one<CompanyRow>(
        `
        SELECT id, name, slug, status
        FROM companies
        WHERE id = ?
        `,
      [id],
    );

    return row ? mapCompany(row) : null;
  }

  async findSubmissionById(id: string): Promise<SubmissionRow | null> {
    const row = await dataSource.one<SubmissionRow>(
        `
        SELECT id, company_id, status
        FROM diagnosis_submissions
        WHERE id = ? AND submission_type = 'RESEARCH'
        `,
      [id],
    );

    return row ?? null;
  }

  async createTask(input: ActionPlanTaskRecord): Promise<ActionPlanTaskRecord> {
    await dataSource.execute(
        `
        INSERT INTO action_plan_tasks (
          id,
          company_id,
          submission_id,
          title,
          description,
          pillar,
          priority,
          status,
          due_date,
          responsible_user_id,
          source,
          created_at,
          updated_at,
          completed_at
        )
        VALUES (
          @id,
          @companyId,
          @submissionId,
          @title,
          @description,
          @pillar,
          @priority,
          @status,
          @dueDate,
          @responsibleUserId,
          @source,
          @createdAt,
          @updatedAt,
          @completedAt
        )
        `,
      input,
    );

    return input;
  }

  async createTasks(tasks: ActionPlanTaskRecord[]): Promise<ActionPlanTaskRecord[]> {
    await dataSource.transaction(async () => {
      for (const item of tasks) {
        await this.createTask(item);
      }
    });
    return tasks;
  }

  async findTaskById(id: string): Promise<ActionPlanTaskDetails | null> {
    const row = await dataSource.one<ActionPlanTaskDetailsRow>(
        `
        SELECT
          apt.id,
          apt.company_id,
          apt.submission_id,
          apt.title,
          apt.description,
          apt.pillar,
          apt.priority,
          apt.status,
          apt.due_date,
          apt.responsible_user_id,
          apt.source,
          apt.created_at,
          apt.updated_at,
          apt.completed_at,
          c.name AS company_name,
          u.name AS responsible_user_name,
          u.email AS responsible_user_email
        FROM action_plan_tasks apt
        INNER JOIN companies c ON c.id = apt.company_id
        LEFT JOIN users u ON u.id = apt.responsible_user_id
        WHERE apt.id = ?
        `,
      [id],
    );

    return row ? mapTaskDetails(row) : null;
  }

  async listTasks(filters: {
    companyId?: string;
    submissionId?: string;
  }): Promise<ActionPlanTaskDetails[]> {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filters.companyId) {
      conditions.push('apt.company_id = ?');
      params.push(filters.companyId);
    }

    if (filters.submissionId) {
      conditions.push('apt.submission_id = ?');
      params.push(filters.submissionId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dataSource.many<ActionPlanTaskDetailsRow>(
        `
        SELECT
          apt.id,
          apt.company_id,
          apt.submission_id,
          apt.title,
          apt.description,
          apt.pillar,
          apt.priority,
          apt.status,
          apt.due_date,
          apt.responsible_user_id,
          apt.source,
          apt.created_at,
          apt.updated_at,
          apt.completed_at,
          c.name AS company_name,
          u.name AS responsible_user_name,
          u.email AS responsible_user_email
        FROM action_plan_tasks apt
        INNER JOIN companies c ON c.id = apt.company_id
        LEFT JOIN users u ON u.id = apt.responsible_user_id
        ${whereClause}
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
          COALESCE(apt.due_date, apt.updated_at) ASC,
          apt.created_at DESC
        `,
      params,
    );

    return rows.map(mapTaskDetails);
  }

  async updateTask(input: ActionPlanTaskRecord): Promise<ActionPlanTaskRecord> {
    await dataSource.execute(
        `
        UPDATE action_plan_tasks
        SET company_id = @companyId,
            submission_id = @submissionId,
            title = @title,
            description = @description,
            pillar = @pillar,
            priority = @priority,
            status = @status,
            due_date = @dueDate,
            responsible_user_id = @responsibleUserId,
            source = @source,
            updated_at = @updatedAt,
            completed_at = @completedAt
        WHERE id = @id
        `,
      input,
    );

    return input;
  }
}
