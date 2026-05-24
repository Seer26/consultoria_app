import bcrypt from 'bcrypt';

import { database } from '../db/database';

const TEST_PASSWORD = '123456';
const TEST_COMPANY_ID = 'company-demo';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .trim();
}

function getTableColumns(tableName: string): string[] {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;

  return rows.map((row) => row.name);
}

function ensureColumn(tableName: string, columnName: string, definition: string): void {
  const columns = getTableColumns(tableName);
  if (!columns.includes(columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function runMigrations(): void {
  ensureColumn('companies', 'slug', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('companies', 'status', `TEXT NOT NULL DEFAULT 'ACTIVE'`);
  ensureColumn('companies', 'updated_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('users', 'updated_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('users', 'status', `TEXT NOT NULL DEFAULT 'ACTIVE'`);
  ensureColumn('diagnosis_submissions', 'user_id', `TEXT`);
  ensureColumn('diagnosis_submissions', 'submission_type', `TEXT NOT NULL DEFAULT 'DIAGNOSIS'`);
  ensureColumn('diagnosis_submissions', 'respondent_role', `TEXT`);
  ensureColumn('diagnosis_submissions', 'department', `TEXT`);
  ensureColumn('diagnosis_submissions', 'status', `TEXT NOT NULL DEFAULT 'COMPLETED'`);
  ensureColumn('diagnosis_submissions', 'overall_score', `REAL`);
  ensureColumn('diagnosis_submissions', 'summary', `TEXT`);
  ensureColumn('diagnosis_submissions', 'critical_points', `TEXT`);
  ensureColumn('diagnosis_submissions', 'opportunities', `TEXT`);
  ensureColumn('diagnosis_submissions', 'recommendations', `TEXT`);
  ensureColumn('diagnosis_submissions', 'next_steps', `TEXT`);
  ensureColumn('diagnosis_submissions', 'pillar_scores', `TEXT`);
  ensureColumn('diagnosis_submissions', 'updated_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('diagnosis_submissions', 'completed_at', `TEXT`);
  ensureColumn('diagnosis_answers', 'question', `TEXT`);
  ensureColumn('diagnosis_answers', 'answer', `TEXT`);
  ensureColumn('diagnosis_answers', 'score', `REAL`);
  ensureColumn('diagnosis_answers', 'created_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('action_plan_tasks', 'company_id', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('action_plan_tasks', 'submission_id', `TEXT`);
  ensureColumn('action_plan_tasks', 'title', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('action_plan_tasks', 'description', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('action_plan_tasks', 'pillar', `TEXT`);
  ensureColumn('action_plan_tasks', 'priority', `TEXT NOT NULL DEFAULT 'MEDIUM'`);
  ensureColumn('action_plan_tasks', 'status', `TEXT NOT NULL DEFAULT 'TODO'`);
  ensureColumn('action_plan_tasks', 'due_date', `TEXT`);
  ensureColumn('action_plan_tasks', 'responsible_user_id', `TEXT`);
  ensureColumn('action_plan_tasks', 'source', `TEXT NOT NULL DEFAULT 'MANUAL'`);
  ensureColumn('action_plan_tasks', 'created_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('action_plan_tasks', 'updated_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('action_plan_tasks', 'completed_at', `TEXT`);

  database.exec(`
    UPDATE companies
    SET slug = CASE
      WHEN slug IS NULL OR TRIM(slug) = '' THEN LOWER(REPLACE(id, ' ', '-'))
      ELSE slug
    END
  `);

  const companies = database.prepare(`SELECT id, name, slug FROM companies`).all() as Array<{
    id: string;
    name: string;
    slug: string;
  }>;

  const usedSlugs = new Set<string>();
  const updateCompanySlug = database.prepare(`
    UPDATE companies
    SET slug = @slug
    WHERE id = @id
  `);

  for (const company of companies) {
    const baseSlug = slugify(company.name) || slugify(company.slug) || company.id;
    let candidate = baseSlug;
    let suffix = 1;

    while (usedSlugs.has(candidate)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(candidate);

    if (candidate !== company.slug) {
      updateCompanySlug.run({
        id: company.id,
        slug: candidate,
      });
    }
  }

  database.exec(`
    UPDATE companies
    SET status = 'ACTIVE'
    WHERE status IS NULL OR TRIM(status) = ''
  `);

  database.exec(`
    UPDATE companies
    SET updated_at = created_at
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
  `);

  database.exec(`
    UPDATE users
    SET status = 'ACTIVE'
    WHERE status IS NULL OR TRIM(status) = ''
  `);

  database.exec(`
    UPDATE users
    SET updated_at = created_at
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
  `);

  database.exec(`
    UPDATE diagnosis_submissions
    SET submission_type = 'DIAGNOSIS'
    WHERE submission_type IS NULL OR TRIM(submission_type) = ''
  `);

  database.exec(`
    UPDATE diagnosis_submissions
    SET status = 'COMPLETED'
    WHERE status IS NULL OR TRIM(status) = ''
  `);

  database.exec(`
    UPDATE diagnosis_submissions
    SET updated_at = created_at
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
  `);

  database.exec(`
    UPDATE diagnosis_submissions
    SET completed_at = created_at
    WHERE completed_at IS NULL AND status = 'COMPLETED'
  `);

  database.exec(`
    UPDATE diagnosis_answers
    SET created_at = COALESCE(
      (SELECT created_at FROM diagnosis_submissions WHERE diagnosis_submissions.id = diagnosis_answers.submission_id),
      datetime('now')
    )
    WHERE created_at IS NULL OR TRIM(created_at) = ''
  `);

  database.exec(`
    INSERT OR IGNORE INTO action_plan_tasks (
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
    SELECT
      at.id,
      ds.company_id,
      at.submission_id,
      at.title,
      at.description,
      at.pillar,
      CASE UPPER(at.priority)
        WHEN 'ALTA' THEN 'HIGH'
        WHEN 'MEDIA' THEN 'MEDIUM'
        WHEN 'BAIXA' THEN 'LOW'
        ELSE UPPER(at.priority)
      END,
      CASE UPPER(at.status)
        WHEN 'PENDING' THEN 'TODO'
        WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
        WHEN 'DONE' THEN 'DONE'
        ELSE UPPER(at.status)
      END,
      NULL,
      NULL,
      'AI',
      COALESCE(ds.completed_at, ds.created_at, datetime('now')),
      COALESCE(ds.completed_at, ds.created_at, datetime('now')),
      CASE
        WHEN UPPER(at.status) = 'DONE' THEN COALESCE(ds.completed_at, ds.created_at, datetime('now'))
        ELSE NULL
      END
    FROM action_tasks at
    INNER JOIN diagnosis_submissions ds ON ds.id = at.submission_id
  `);

  database.exec(`
    UPDATE action_plan_tasks
    SET source = 'MANUAL'
    WHERE source IS NULL OR TRIM(source) = ''
  `);

  database.exec(`
    UPDATE action_plan_tasks
    SET status = 'TODO'
    WHERE status IS NULL OR TRIM(status) = ''
  `);

  database.exec(`
    UPDATE action_plan_tasks
    SET priority = 'MEDIUM'
    WHERE priority IS NULL OR TRIM(priority) = ''
  `);

  database.exec(`
    UPDATE action_plan_tasks
    SET created_at = COALESCE(
      (SELECT created_at FROM diagnosis_submissions WHERE diagnosis_submissions.id = action_plan_tasks.submission_id),
      datetime('now')
    )
    WHERE created_at IS NULL OR TRIM(created_at) = ''
  `);

  database.exec(`
    UPDATE action_plan_tasks
    SET updated_at = created_at
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
  `);

  database.exec(`
    UPDATE action_plan_tasks
    SET company_id = COALESCE(
      (SELECT company_id FROM diagnosis_submissions WHERE diagnosis_submissions.id = action_plan_tasks.submission_id),
      company_id
    )
    WHERE company_id IS NULL OR TRIM(company_id) = ''
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_company_id
    ON action_plan_tasks(company_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_submission_id
    ON action_plan_tasks(submission_id)
  `);

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_unique
    ON companies(slug)
  `);
}

const seedUsers = [
  {
    id: 'user-admin-teste',
    name: 'Admin Teste',
    email: 'admin@teste.com',
    role: 'ADMIN',
    companyId: null,
  },
  {
    id: 'user-owner-teste',
    name: 'Dono Teste',
    email: 'owner@teste.com',
    role: 'OWNER',
    companyId: TEST_COMPANY_ID,
  },
  {
    id: 'user-employee-teste',
    name: 'Funcionario Teste',
    email: 'employee@teste.com',
    role: 'EMPLOYEE',
    companyId: TEST_COMPANY_ID,
  },
] as const;

export async function initDatabase(): Promise<void> {
  runMigrations();

  const now = new Date().toISOString();
  database
    .prepare(
      `
      INSERT INTO companies (id, name, slug, status, sector, size, created_at, updated_at)
      VALUES (@id, @name, @slug, @status, @sector, @size, @createdAt, @updatedAt)
      ON CONFLICT(id) DO NOTHING
      `,
    )
    .run({
      id: TEST_COMPANY_ID,
      name: 'Empresa Demo',
      slug: 'empresa-demo',
      status: 'ACTIVE',
      sector: 'Consultoria',
      size: 'SMB',
      createdAt: now,
      updatedAt: now,
    });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const upsertUser = database.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at, status)
    VALUES (@id, @name, @email, @passwordHash, @role, @companyId, @createdAt, @updatedAt, @status)
    ON CONFLICT(email) DO UPDATE SET
      id = excluded.id,
      name = excluded.name,
      password_hash = excluded.password_hash,
      role = excluded.role,
      company_id = excluded.company_id,
      updated_at = excluded.updated_at,
      status = excluded.status
  `);

  for (const user of seedUsers) {
    upsertUser.run({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash,
      role: user.role,
      companyId: user.companyId,
      createdAt: now,
      updatedAt: now,
      status: 'ACTIVE',
    });
  }

  console.log('Banco pronto e usuarios de teste padronizados');
}
