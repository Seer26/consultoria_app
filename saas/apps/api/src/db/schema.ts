export const schemaStatements = [
  `
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    sector TEXT,
    size TEXT,
    phone TEXT,
    responsible_name TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    company_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    auth_version INTEGER NOT NULL DEFAULT 0,
    department TEXT,
    job_function TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS diagnosis_submissions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT,
    submission_type TEXT NOT NULL DEFAULT 'DIAGNOSIS',
    questionnaire_id TEXT NOT NULL,
    respondent_role TEXT,
    department TEXT,
    respondent_department TEXT,
    respondent_job_function TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    diagnosis_status TEXT NOT NULL DEFAULT 'PUBLICADO',
    approved_by_user_id TEXT,
    approved_at TEXT,
    published_by_user_id TEXT,
    published_at TEXT,
    review_notes TEXT,
    overall_score REAL,
    summary TEXT,
    critical_points TEXT,
    opportunities TEXT,
    recommendations TEXT,
    next_steps TEXT,
    pillar_scores TEXT,
    ai_analysis TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS diagnosis_answers (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question TEXT,
    answer TEXT,
    pillar TEXT NOT NULL,
    value INTEGER NOT NULL,
    score REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES diagnosis_submissions(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS action_tasks (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    pillar TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES diagnosis_submissions(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS action_plan_tasks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    submission_id TEXT,
    plan_version_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    pillar TEXT,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    due_date TEXT,
    responsible_user_id TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (submission_id) REFERENCES diagnosis_submissions(id),
    FOREIGN KEY (plan_version_id) REFERENCES action_plan_versions(id),
    FOREIGN KEY (responsible_user_id) REFERENCES users(id)
  )
  `,
  `
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
    UNIQUE(submission_id, version_number),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (submission_id) REFERENCES diagnosis_submissions(id),
    FOREIGN KEY (generated_by_user_id) REFERENCES users(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    max_users INTEGER NOT NULL,
    max_research_submissions_monthly INTEGER NOT NULL,
    max_report_pdfs_monthly INTEGER NOT NULL,
    max_active_action_tasks INTEGER NOT NULL,
    max_ai_questions_monthly INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS company_subscriptions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL UNIQUE,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS usage_counters (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    period TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE(company_id, feature, period),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS company_subscription_events (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    previous_plan_id TEXT,
    new_plan_id TEXT NOT NULL,
    actor_user_id TEXT,
    origin TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (previous_plan_id) REFERENCES plans(id),
    FOREIGN KEY (new_plan_id) REFERENCES plans(id),
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    requested_ip_hash TEXT,
    request_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS legal_acceptances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT,
    document_type TEXT NOT NULL,
    document_version TEXT NOT NULL,
    accepted_at TEXT NOT NULL,
    ip_hash TEXT,
    request_id TEXT,
    origin TEXT NOT NULL,
    metadata TEXT,
    UNIQUE(user_id, document_type, document_version),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS company_strategy (
    company_id TEXT PRIMARY KEY,
    mission TEXT NOT NULL DEFAULT '',
    vision TEXT NOT NULL DEFAULT '',
    values_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS strategic_objectives (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PLANNED',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    start_date TEXT,
    due_date TEXT,
    responsible_user_id TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE SET NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS strategic_goals (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    objective_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    initial_value REAL,
    target_value REAL,
    unit TEXT,
    current_value REAL,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (objective_id) REFERENCES strategic_objectives(id) ON DELETE CASCADE
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS swot_items (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  )
  `,
  `CREATE INDEX IF NOT EXISTS idx_strategic_objectives_company_status ON strategic_objectives(company_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_strategic_objectives_company_due_date ON strategic_objectives(company_id, due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_strategic_goals_objective ON strategic_goals(objective_id)`,
  `CREATE INDEX IF NOT EXISTS idx_strategic_goals_company_due_date ON strategic_goals(company_id, due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_swot_items_company_category ON swot_items(company_id, category)`,
  `CREATE INDEX IF NOT EXISTS idx_diagnosis_submissions_diagnosis_status ON diagnosis_submissions(diagnosis_status)`,
  `CREATE INDEX IF NOT EXISTS idx_action_plan_versions_company_submission ON action_plan_versions(company_id, submission_id)`,
  `CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_plan_version ON action_plan_tasks(plan_version_id)`,
];
