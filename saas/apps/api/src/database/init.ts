import { database } from '../db/database';

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

function getCurrentPeriodRange(now = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function seedPlansAndSubscriptions(): void {
  const now = new Date().toISOString();
  const period = getCurrentPeriodRange();

  database.prepare(`
    INSERT INTO plans (
      id, slug, name, description, status,
      max_users, max_research_submissions_monthly, max_report_pdfs_monthly,
      max_active_action_tasks, max_ai_questions_monthly,
      created_at, updated_at
    ) VALUES (
      'plan-starter', 'starter', 'Starter',
      'Plano inicial para operacao controlada do SaaS.',
      'ACTIVE', 5, 20, 30, 100, 100, @now, @now
    )
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      max_users = excluded.max_users,
      max_research_submissions_monthly = excluded.max_research_submissions_monthly,
      max_report_pdfs_monthly = excluded.max_report_pdfs_monthly,
      max_active_action_tasks = excluded.max_active_action_tasks,
      max_ai_questions_monthly = excluded.max_ai_questions_monthly,
      updated_at = excluded.updated_at
  `).run({ now });

  database.prepare(`
    INSERT INTO plans (
      id, slug, name, description, status,
      max_users, max_research_submissions_monthly, max_report_pdfs_monthly,
      max_active_action_tasks, max_ai_questions_monthly,
      created_at, updated_at
    ) VALUES (
      'plan-growth', 'growth', 'Growth',
      'Plano intermediario preparado para beta e expansao.',
      'ACTIVE', 20, 100, 150, 500, 500, @now, @now
    )
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      max_users = excluded.max_users,
      max_research_submissions_monthly = excluded.max_research_submissions_monthly,
      max_report_pdfs_monthly = excluded.max_report_pdfs_monthly,
      max_active_action_tasks = excluded.max_active_action_tasks,
      max_ai_questions_monthly = excluded.max_ai_questions_monthly,
      updated_at = excluded.updated_at
  `).run({ now });

  database.prepare(`
    INSERT OR IGNORE INTO company_subscriptions (
      id, company_id, plan_id, status,
      current_period_start, current_period_end,
      created_at, updated_at
    )
    SELECT
      'subscription-' || c.id,
      c.id,
      'plan-starter',
      'ACTIVE',
      @periodStart,
      @periodEnd,
      @now,
      @now
    FROM companies c
  `).run({
    periodStart: period.start,
    periodEnd: period.end,
    now,
  });
}

function runMigrations(): void {
  ensureColumn('companies', 'slug', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('companies', 'status', `TEXT NOT NULL DEFAULT 'ACTIVE'`);
  ensureColumn('companies', 'sector', `TEXT`);
  ensureColumn('companies', 'size', `TEXT`);
  ensureColumn('companies', 'phone', `TEXT`);
  ensureColumn('companies', 'responsible_name', `TEXT`);
  ensureColumn('companies', 'notes', `TEXT`);
  ensureColumn('companies', 'updated_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('users', 'updated_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('users', 'status', `TEXT NOT NULL DEFAULT 'ACTIVE'`);
  ensureColumn('users', 'auth_version', `INTEGER NOT NULL DEFAULT 0`);
  ensureColumn('users', 'department', `TEXT`);
  ensureColumn('users', 'job_function', `TEXT`);
  ensureColumn('diagnosis_submissions', 'user_id', `TEXT`);
  ensureColumn('diagnosis_submissions', 'submission_type', `TEXT NOT NULL DEFAULT 'DIAGNOSIS'`);
  ensureColumn('diagnosis_submissions', 'respondent_role', `TEXT`);
  ensureColumn('diagnosis_submissions', 'department', `TEXT`);
  ensureColumn('diagnosis_submissions', 'respondent_department', `TEXT`);
  ensureColumn('diagnosis_submissions', 'respondent_job_function', `TEXT`);
  ensureColumn('diagnosis_submissions', 'status', `TEXT NOT NULL DEFAULT 'COMPLETED'`);
  ensureColumn('diagnosis_submissions', 'diagnosis_status', `TEXT NOT NULL DEFAULT 'PUBLICADO'`);
  ensureColumn('diagnosis_submissions', 'approved_by_user_id', `TEXT`);
  ensureColumn('diagnosis_submissions', 'approved_at', `TEXT`);
  ensureColumn('diagnosis_submissions', 'published_by_user_id', `TEXT`);
  ensureColumn('diagnosis_submissions', 'published_at', `TEXT`);
  ensureColumn('diagnosis_submissions', 'review_notes', `TEXT`);
  ensureColumn('diagnosis_submissions', 'overall_score', `REAL`);
  ensureColumn('diagnosis_submissions', 'summary', `TEXT`);
  ensureColumn('diagnosis_submissions', 'critical_points', `TEXT`);
  ensureColumn('diagnosis_submissions', 'opportunities', `TEXT`);
  ensureColumn('diagnosis_submissions', 'recommendations', `TEXT`);
  ensureColumn('diagnosis_submissions', 'next_steps', `TEXT`);
  ensureColumn('diagnosis_submissions', 'pillar_scores', `TEXT`);
  ensureColumn('diagnosis_submissions', 'ai_analysis', `TEXT`);
  ensureColumn('diagnosis_submissions', 'updated_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('diagnosis_submissions', 'completed_at', `TEXT`);
  ensureColumn('diagnosis_answers', 'question', `TEXT`);
  ensureColumn('diagnosis_answers', 'answer', `TEXT`);
  ensureColumn('diagnosis_answers', 'score', `REAL`);
  ensureColumn('diagnosis_answers', 'created_at', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('action_plan_tasks', 'company_id', `TEXT NOT NULL DEFAULT ''`);
  ensureColumn('action_plan_tasks', 'submission_id', `TEXT`);
  ensureColumn('action_plan_tasks', 'plan_version_id', `TEXT`);
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
  ensureColumn('plans', 'description', `TEXT`);

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
    SET diagnosis_status = 'PUBLICADO'
    WHERE diagnosis_status IS NULL OR TRIM(diagnosis_status) = ''
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
    CREATE TABLE IF NOT EXISTS action_plan_versions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      submission_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      source TEXT NOT NULL DEFAULT 'AI',
      generated_by_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      UNIQUE(submission_id, version_number)
    )
  `);

  database.exec(`
    INSERT OR IGNORE INTO action_plan_versions (
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
    SELECT
      'plan-version-' || apt.submission_id || '-1',
      apt.company_id,
      apt.submission_id,
      1,
      'ACTIVE',
      'AI',
      COALESCE(ds.user_id, apt.responsible_user_id),
      MIN(apt.created_at),
      MAX(apt.updated_at),
      NULL
    FROM action_plan_tasks apt
    INNER JOIN diagnosis_submissions ds ON ds.id = apt.submission_id
    WHERE apt.submission_id IS NOT NULL
      AND apt.plan_version_id IS NULL
    GROUP BY apt.company_id, apt.submission_id, COALESCE(ds.user_id, apt.responsible_user_id)
  `);

  database.exec(`
    UPDATE action_plan_tasks
    SET plan_version_id = 'plan-version-' || submission_id || '-1'
    WHERE submission_id IS NOT NULL
      AND plan_version_id IS NULL
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
    CREATE INDEX IF NOT EXISTS idx_action_plan_versions_company_submission
    ON action_plan_versions(company_id, submission_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_plan_version
    ON action_plan_tasks(plan_version_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_diagnosis_submissions_diagnosis_status
    ON diagnosis_submissions(diagnosis_status)
  `);

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_unique
    ON companies(slug)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_usage_counters_company_feature_period
    ON usage_counters(company_id, feature, period)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id
    ON company_subscriptions(company_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_company_subscription_events_company_id
    ON company_subscription_events(company_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_status
    ON password_reset_tokens(user_id, status)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
    ON password_reset_tokens(expires_at)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_document
    ON legal_acceptances(user_id, document_type, document_version)
  `);

  seedPlansAndSubscriptions();
}

export async function initDatabase(): Promise<void> {
  runMigrations();
  console.log(
    'Banco pronto sem seed automatico. Use o comando demo:seed somente em base demo isolada.',
  );
}
