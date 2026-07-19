CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  request_id TEXT,
  result TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_company_created
  ON audit_events(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor_created
  ON audit_events(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnosis_submissions_company_type_created
  ON diagnosis_submissions(company_id, submission_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_company_status_due
  ON action_plan_tasks(company_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_responsible_status
  ON action_plan_tasks(responsible_user_id, status);

CREATE INDEX IF NOT EXISTS idx_company_subscription_events_company_created
  ON company_subscription_events(company_id, created_at DESC);

ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE companies
  ADD CONSTRAINT companies_status_check
  CHECK (status IN ('ACTIVE', 'INACTIVE'));

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('ADMIN', 'OWNER', 'EMPLOYEE'));

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('ACTIVE', 'INACTIVE'));

ALTER TABLE diagnosis_submissions
  DROP CONSTRAINT IF EXISTS diagnosis_submissions_status_check;
ALTER TABLE diagnosis_submissions
  ADD CONSTRAINT diagnosis_submissions_status_check
  CHECK (status IN ('IN_PROGRESS', 'COMPLETED'));

ALTER TABLE action_plan_tasks
  DROP CONSTRAINT IF EXISTS action_plan_tasks_priority_check;
ALTER TABLE action_plan_tasks
  ADD CONSTRAINT action_plan_tasks_priority_check
  CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

ALTER TABLE action_plan_tasks
  DROP CONSTRAINT IF EXISTS action_plan_tasks_status_check;
ALTER TABLE action_plan_tasks
  ADD CONSTRAINT action_plan_tasks_status_check
  CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELED'));

ALTER TABLE action_plan_tasks
  DROP CONSTRAINT IF EXISTS action_plan_tasks_source_check;
ALTER TABLE action_plan_tasks
  ADD CONSTRAINT action_plan_tasks_source_check
  CHECK (source IN ('RESEARCH_RECOMMENDATION', 'MANUAL', 'AI', 'STAGING_SYNTHETIC'));

ALTER TABLE plans
  DROP CONSTRAINT IF EXISTS plans_limits_non_negative_check;
ALTER TABLE plans
  ADD CONSTRAINT plans_limits_non_negative_check
  CHECK (
    max_users >= 0
    AND max_research_submissions_monthly >= 0
    AND max_report_pdfs_monthly >= 0
    AND max_active_action_tasks >= 0
    AND max_ai_questions_monthly >= 0
  );

ALTER TABLE usage_counters
  DROP CONSTRAINT IF EXISTS usage_counters_quantity_non_negative_check;
ALTER TABLE usage_counters
  ADD CONSTRAINT usage_counters_quantity_non_negative_check
  CHECK (quantity >= 0);
