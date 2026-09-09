ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS diagnosis_status TEXT NOT NULL DEFAULT 'PUBLICADO';

ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS approved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS approved_at TEXT;

ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS published_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS published_at TEXT;

ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

UPDATE diagnosis_submissions
SET diagnosis_status = 'PUBLICADO',
    published_at = COALESCE(published_at, completed_at, updated_at, created_at)
WHERE submission_type = 'RESEARCH'
  AND status = 'COMPLETED'
  AND (diagnosis_status IS NULL OR TRIM(diagnosis_status) = '');

CREATE TABLE IF NOT EXISTS action_plan_versions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL REFERENCES diagnosis_submissions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  source TEXT NOT NULL DEFAULT 'AI',
  generated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(submission_id, version_number)
);

ALTER TABLE action_plan_tasks
  ADD COLUMN IF NOT EXISTS plan_version_id TEXT REFERENCES action_plan_versions(id) ON DELETE SET NULL;

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
ON CONFLICT(id) DO NOTHING;

UPDATE action_plan_tasks apt
SET plan_version_id = 'plan-version-' || apt.submission_id || '-1'
WHERE apt.submission_id IS NOT NULL
  AND apt.plan_version_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_diagnosis_submissions_diagnosis_status
  ON diagnosis_submissions(diagnosis_status);

CREATE INDEX IF NOT EXISTS idx_action_plan_versions_company_submission
  ON action_plan_versions(company_id, submission_id);

CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_plan_version
  ON action_plan_tasks(plan_version_id);
