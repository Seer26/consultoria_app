import { dataSource } from '../../database/data-source';
import type {
  ActionPlanAssignee,
  ActionPlanCompanyRecord,
  ActionPlanVersionRecord,
  ActionPlanVersionSummary,
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
  diagnosis_status: 'AGUARDANDO_REVISAO' | 'APROVADO' | 'PUBLICADO' | null;
}

interface ActionPlanVersionRow {
  id: string;
  company_id: string;
  submission_id: string;
  version_number: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  source: 'AI' | 'MANUAL';
  generated_by_user_id: string | null;
  generated_by_user_name: string | null;
  tasks_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface ActionPlanTaskRow {
  id: string;
  company_id: string;
  submission_id: string | null;
  plan_version_id: string | null;
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
    planVersionId: row.plan_version_id,
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

function mapVersion(row: ActionPlanVersionRow): ActionPlanVersionSummary {
  return {
    id: row.id,
    companyId: row.company_id,
    submissionId: row.submission_id,
    versionNumber: Number(row.version_number),
    status: row.status,
    source: row.source,
    generatedByUserId: row.generated_by_user_id,
    generatedByUserName: row.generated_by_user_name,
    tasksCount: Number(row.tasks_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
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
          AND u.role = 'EMPLOYEE'
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
        SELECT id, company_id, status, diagnosis_status
        FROM diagnosis_submissions
        WHERE id = ? AND submission_type = 'RESEARCH'
        `,
      [id],
    );

    return row ?? null;
  }

  async createPlanVersion(input: ActionPlanVersionRecord): Promise<ActionPlanVersionSummary> {
    await dataSource.execute(
      `
      INSERT INTO action_plan_versions (
        id,
        company_id,
        submission_id,
        version_number,
        status,
        source,
        generated_by_user_id,
        created_at,
        updated_at,
        archived_at
      )
      VALUES (
        @id,
        @companyId,
        @submissionId,
        @versionNumber,
        @status,
        @source,
        @generatedByUserId,
        @createdAt,
        @updatedAt,
        @archivedAt
      )
      `,
      input,
    );

    return (await this.findPlanVersionById(input.id))!;
  }

  async getNextPlanVersionNumber(submissionId: string): Promise<number> {
    const row = await dataSource.one<{ max_version: number | null }>(
      `
      SELECT MAX(version_number) AS max_version
      FROM action_plan_versions
      WHERE submission_id = ?
      `,
      [submissionId],
    );
    return Number(row?.max_version ?? 0) + 1;
  }

  async findPlanVersionById(id: string): Promise<ActionPlanVersionSummary | null> {
    const row = await dataSource.one<ActionPlanVersionRow>(
      `
      SELECT
        apv.id,
        apv.company_id,
        apv.submission_id,
        apv.version_number,
        apv.status,
        apv.source,
        apv.generated_by_user_id,
        u.name AS generated_by_user_name,
        COUNT(apt.id) AS tasks_count,
        apv.created_at,
        apv.updated_at,
        apv.archived_at
      FROM action_plan_versions apv
      LEFT JOIN users u ON u.id = apv.generated_by_user_id
      LEFT JOIN action_plan_tasks apt ON apt.plan_version_id = apv.id
      WHERE apv.id = ?
      GROUP BY
        apv.id,
        apv.company_id,
        apv.submission_id,
        apv.version_number,
        apv.status,
        apv.source,
        apv.generated_by_user_id,
        u.name,
        apv.created_at,
        apv.updated_at,
        apv.archived_at
      `,
      [id],
    );
    return row ? mapVersion(row) : null;
  }

  async listPlanVersions(filters: {
    companyId?: string;
    submissionId?: string;
  }): Promise<ActionPlanVersionSummary[]> {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filters.companyId) {
      conditions.push('apv.company_id = ?');
      params.push(filters.companyId);
    }

    if (filters.submissionId) {
      conditions.push('apv.submission_id = ?');
      params.push(filters.submissionId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dataSource.many<ActionPlanVersionRow>(
      `
      SELECT
        apv.id,
        apv.company_id,
        apv.submission_id,
        apv.version_number,
        apv.status,
        apv.source,
        apv.generated_by_user_id,
        u.name AS generated_by_user_name,
        COUNT(apt.id) AS tasks_count,
        apv.created_at,
        apv.updated_at,
        apv.archived_at
      FROM action_plan_versions apv
      LEFT JOIN users u ON u.id = apv.generated_by_user_id
      LEFT JOIN action_plan_tasks apt ON apt.plan_version_id = apv.id
      ${whereClause}
      GROUP BY
        apv.id,
        apv.company_id,
        apv.submission_id,
        apv.version_number,
        apv.status,
        apv.source,
        apv.generated_by_user_id,
        u.name,
        apv.created_at,
        apv.updated_at,
        apv.archived_at
      ORDER BY apv.version_number DESC
      `,
      params,
    );
    return rows.map(mapVersion);
  }

  async archiveActivePlanVersions(submissionId: string, archivedAt: string): Promise<void> {
    await dataSource.execute(
      `
      UPDATE action_plan_versions
      SET status = 'ARCHIVED',
          archived_at = @archivedAt,
          updated_at = @archivedAt
      WHERE submission_id = @submissionId
        AND status = 'ACTIVE'
      `,
      { submissionId, archivedAt },
    );
  }

  async updatePlanVersionStatus(
    id: string,
    status: ActionPlanVersionRecord['status'],
    updatedAt: string,
  ): Promise<ActionPlanVersionSummary> {
    await dataSource.execute(
      `
      UPDATE action_plan_versions
      SET status = @status,
          updated_at = @updatedAt,
          archived_at = CASE WHEN @status = 'ARCHIVED' THEN @updatedAt ELSE archived_at END
      WHERE id = @id
      `,
      { id, status, updatedAt },
    );
    return (await this.findPlanVersionById(id))!;
  }

  async createTask(input: ActionPlanTaskRecord): Promise<ActionPlanTaskRecord> {
    await dataSource.execute(
        `
        INSERT INTO action_plan_tasks (
          id,
          company_id,
          submission_id,
          plan_version_id,
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
          @planVersionId,
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
          apt.plan_version_id,
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
    planVersionId?: string;
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

    if (filters.planVersionId) {
      conditions.push('apt.plan_version_id = ?');
      params.push(filters.planVersionId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dataSource.many<ActionPlanTaskDetailsRow>(
        `
        SELECT
          apt.id,
          apt.company_id,
          apt.submission_id,
          apt.plan_version_id,
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
            plan_version_id = @planVersionId,
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
