import { database } from '../../db/database';
import type {
  ActionPlanCompanyRecord,
  ActionPlanTaskDetails,
  ActionPlanTaskRecord,
  AuthenticatedActionPlanUser,
} from './action-plan.types';

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
  };
}

export class ActionPlanRepository {
  findUserById(id: string): AuthenticatedActionPlanUser | null {
    const row = database
      .prepare(
        `
        SELECT id, name, email, role, company_id, status
        FROM users
        WHERE id = ?
        `,
      )
      .get(id) as UserRow | undefined;

    return row ? mapUser(row) : null;
  }

  findCompanyById(id: string): ActionPlanCompanyRecord | null {
    const row = database
      .prepare(
        `
        SELECT id, name, slug, status
        FROM companies
        WHERE id = ?
        `,
      )
      .get(id) as CompanyRow | undefined;

    return row ? mapCompany(row) : null;
  }

  findSubmissionById(id: string): SubmissionRow | null {
    const row = database
      .prepare(
        `
        SELECT id, company_id, status
        FROM diagnosis_submissions
        WHERE id = ? AND submission_type = 'RESEARCH'
        `,
      )
      .get(id) as SubmissionRow | undefined;

    return row ?? null;
  }

  createTask(input: ActionPlanTaskRecord): ActionPlanTaskRecord {
    database
      .prepare(
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
      )
      .run(input);

    return input;
  }

  createTasks(tasks: ActionPlanTaskRecord[]): ActionPlanTaskRecord[] {
    const insertMany = database.transaction((items: ActionPlanTaskRecord[]) => {
      for (const item of items) {
        this.createTask(item);
      }
    });

    insertMany(tasks);
    return tasks;
  }

  findTaskById(id: string): ActionPlanTaskDetails | null {
    const row = database
      .prepare(
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
      )
      .get(id) as ActionPlanTaskDetailsRow | undefined;

    return row ? mapTaskDetails(row) : null;
  }

  listTasks(filters: { companyId?: string; submissionId?: string }): ActionPlanTaskDetails[] {
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
    const rows = database
      .prepare(
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
      )
      .all(...params) as ActionPlanTaskDetailsRow[];

    return rows.map(mapTaskDetails);
  }

  updateTask(input: ActionPlanTaskRecord): ActionPlanTaskRecord {
    database
      .prepare(
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
      )
      .run(input);

    return input;
  }
}
