// Bootstrap schema retained for upgrades. initDatabase applies migration 011
// atomically to create plans, monitoring tasks, evidence and history on fresh AND existing databases.
export const schemaStatements = [
  `
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    sector TEXT,
    size TEXT,
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
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    overall_score REAL,
    summary TEXT,
    critical_points TEXT,
    opportunities TEXT,
    recommendations TEXT,
    next_steps TEXT,
    pillar_scores TEXT,
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
    FOREIGN KEY (responsible_user_id) REFERENCES users(id)
  )
  `,
];
