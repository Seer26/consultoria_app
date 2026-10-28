CREATE TABLE job_roles (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id), UNIQUE(company_id,name)
);
CREATE INDEX idx_job_roles_company_active ON job_roles(company_id,active);
CREATE TABLE employee_job_roles (
  employee_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, job_role_id TEXT NOT NULL, assigned_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(employee_id) REFERENCES users(id), FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(job_role_id) REFERENCES job_roles(id)
);
CREATE INDEX idx_employee_job_roles_company_role ON employee_job_roles(company_id,job_role_id);
CREATE TABLE behavioral_questions (
  id TEXT PRIMARY KEY, dimension TEXT NOT NULL CHECK(dimension IN ('EXECUTOR','COMUNICADOR','PLANEJADOR','ANALITICO')), prompt TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1 CHECK(weight>0), reversed INTEGER NOT NULL DEFAULT 0 CHECK(reversed IN (0,1)), position INTEGER NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE assessment_cycles (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, employee_id TEXT NOT NULL, evaluator_id TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('AUTOAVALIACAO','GESTOR','CONSULTOR')), title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('RASCUNHO','EM_ANDAMENTO','CONCLUIDA','CANCELADA')), started_at TEXT, completed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(employee_id) REFERENCES users(id), FOREIGN KEY(evaluator_id) REFERENCES users(id)
);
CREATE INDEX idx_assessment_cycles_company_employee ON assessment_cycles(company_id,employee_id,created_at DESC);
CREATE TABLE behavioral_answers (
  id TEXT PRIMARY KEY, cycle_id TEXT NOT NULL, company_id TEXT NOT NULL, question_id TEXT NOT NULL, value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5), created_at TEXT NOT NULL,
  FOREIGN KEY(cycle_id) REFERENCES assessment_cycles(id) ON DELETE CASCADE, FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(question_id) REFERENCES behavioral_questions(id), UNIQUE(cycle_id,question_id)
);
CREATE TABLE behavioral_scores (
  cycle_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, executor INTEGER NOT NULL CHECK(executor BETWEEN 0 AND 100), comunicador INTEGER NOT NULL CHECK(comunicador BETWEEN 0 AND 100), planejador INTEGER NOT NULL CHECK(planejador BETWEEN 0 AND 100), analitico INTEGER NOT NULL CHECK(analitico BETWEEN 0 AND 100), predominant TEXT NOT NULL, secondary TEXT, created_at TEXT NOT NULL,
  FOREIGN KEY(cycle_id) REFERENCES assessment_cycles(id) ON DELETE CASCADE, FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE competencies (
  id TEXT PRIMARY KEY, company_id TEXT, name TEXT NOT NULL, description TEXT, category TEXT NOT NULL CHECK(category IN ('COMPORTAMENTAL','TECNICA','GESTAO','COMERCIAL','OPERACIONAL')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0,1)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id), UNIQUE(company_id,name)
);
CREATE INDEX idx_competencies_company_category ON competencies(company_id,category,active);
CREATE TABLE competency_assessment_items (
  id TEXT PRIMARY KEY, cycle_id TEXT NOT NULL, company_id TEXT NOT NULL, competency_id TEXT NOT NULL, score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 5), observation TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(cycle_id) REFERENCES assessment_cycles(id) ON DELETE CASCADE, FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(competency_id) REFERENCES competencies(id), UNIQUE(cycle_id,competency_id)
);
CREATE INDEX idx_competency_assessment_company_cycle ON competency_assessment_items(company_id,cycle_id);
