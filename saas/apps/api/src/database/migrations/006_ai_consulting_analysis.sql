ALTER TABLE diagnosis_submissions
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
