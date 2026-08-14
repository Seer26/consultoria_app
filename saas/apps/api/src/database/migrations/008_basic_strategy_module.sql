CREATE TABLE IF NOT EXISTS company_strategy (
  company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  mission TEXT NOT NULL DEFAULT '',
  vision TEXT NOT NULL DEFAULT '',
  values_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategic_objectives (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PLANNED',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  start_date TEXT,
  due_date TEXT,
  responsible_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategic_goals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  initial_value REAL,
  target_value REAL,
  unit TEXT,
  current_value REAL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS swot_items (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_strategic_objectives_company_status
  ON strategic_objectives(company_id, status);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_company_due_date
  ON strategic_objectives(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_objective
  ON strategic_goals(objective_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_company_due_date
  ON strategic_goals(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_swot_items_company_category
  ON swot_items(company_id, category);
