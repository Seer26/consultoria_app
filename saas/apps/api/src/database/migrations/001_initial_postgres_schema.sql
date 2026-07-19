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
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  company_id TEXT REFERENCES companies(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS diagnosis_submissions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  user_id TEXT REFERENCES users(id),
  submission_type TEXT NOT NULL DEFAULT 'DIAGNOSIS',
  questionnaire_id TEXT NOT NULL,
  respondent_role TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  overall_score DOUBLE PRECISION,
  summary TEXT,
  critical_points TEXT,
  opportunities TEXT,
  recommendations TEXT,
  next_steps TEXT,
  pillar_scores TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS diagnosis_answers (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES diagnosis_submissions(id),
  question_id TEXT NOT NULL,
  question TEXT,
  answer TEXT,
  pillar TEXT NOT NULL,
  value INTEGER NOT NULL,
  score DOUBLE PRECISION,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS action_tasks (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES diagnosis_submissions(id),
  pillar TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS action_plan_tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  submission_id TEXT REFERENCES diagnosis_submissions(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  pillar TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT,
  responsible_user_id TEXT REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'MANUAL',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

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
);

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_counters (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  feature TEXT NOT NULL,
  period TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(company_id, feature, period)
);

CREATE TABLE IF NOT EXISTS company_subscription_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  previous_plan_id TEXT REFERENCES plans(id),
  new_plan_id TEXT NOT NULL REFERENCES plans(id),
  actor_user_id TEXT REFERENCES users(id),
  origin TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_submissions_company_id ON diagnosis_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_submissions_user_id ON diagnosis_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_answers_submission_id ON diagnosis_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_action_tasks_submission_id ON action_tasks(submission_id);
CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_company_id ON action_plan_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_submission_id ON action_plan_tasks(submission_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_company_feature_period ON usage_counters(company_id, feature, period);
CREATE INDEX IF NOT EXISTS idx_company_subscription_events_company_id ON company_subscription_events(company_id);
