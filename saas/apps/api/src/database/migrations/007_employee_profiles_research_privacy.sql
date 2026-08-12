ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS job_function TEXT;

ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS respondent_department TEXT;

ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS respondent_job_function TEXT;

UPDATE diagnosis_submissions
SET respondent_department = COALESCE(respondent_department, department),
    respondent_job_function = COALESCE(respondent_job_function, respondent_role)
WHERE submission_type = 'RESEARCH'
  AND (respondent_department IS NULL OR respondent_job_function IS NULL);
