CREATE TABLE job_profile_versions (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, job_role_id TEXT NOT NULL, version_number INTEGER NOT NULL,
  executor INTEGER NOT NULL CHECK(executor BETWEEN 0 AND 100), comunicador INTEGER NOT NULL CHECK(comunicador BETWEEN 0 AND 100), planejador INTEGER NOT NULL CHECK(planejador BETWEEN 0 AND 100), analitico INTEGER NOT NULL CHECK(analitico BETWEEN 0 AND 100),
  behavioral_weight INTEGER NOT NULL CHECK(behavioral_weight BETWEEN 0 AND 100), competency_weight INTEGER NOT NULL CHECK(competency_weight BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK(status IN ('ACTIVE','SUPERSEDED')), created_by TEXT NOT NULL, created_at TEXT NOT NULL, activated_at TEXT NOT NULL,
  UNIQUE(company_id,job_role_id,version_number), CHECK(behavioral_weight + competency_weight = 100),
  FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(job_role_id) REFERENCES job_roles(id), FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE UNIQUE INDEX idx_job_profile_active ON job_profile_versions(company_id,job_role_id) WHERE status='ACTIVE';
CREATE TABLE job_profile_requirements (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, profile_version_id TEXT NOT NULL, competency_id TEXT NOT NULL,
  expected_level INTEGER NOT NULL CHECK(expected_level BETWEEN 0 AND 5), weight INTEGER NOT NULL CHECK(weight > 0), created_at TEXT NOT NULL,
  UNIQUE(profile_version_id,competency_id), FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(profile_version_id) REFERENCES job_profile_versions(id), FOREIGN KEY(competency_id) REFERENCES competencies(id)
);
CREATE INDEX idx_job_profile_requirements_version ON job_profile_requirements(company_id,profile_version_id);
CREATE TABLE job_fit_analyses (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, employee_id TEXT NOT NULL, job_role_id TEXT NOT NULL, profile_version_id TEXT NOT NULL,
  behavioral_cycle_id TEXT NOT NULL, competency_cycle_id TEXT NOT NULL, behavioral_score REAL NOT NULL, competency_score REAL NOT NULL, overall_score REAL NOT NULL,
  classification TEXT NOT NULL, snapshot_json TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(employee_id) REFERENCES users(id), FOREIGN KEY(job_role_id) REFERENCES job_roles(id), FOREIGN KEY(profile_version_id) REFERENCES job_profile_versions(id), FOREIGN KEY(behavioral_cycle_id) REFERENCES assessment_cycles(id), FOREIGN KEY(competency_cycle_id) REFERENCES assessment_cycles(id), FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX idx_job_fit_employee_history ON job_fit_analyses(company_id,employee_id,created_at DESC);
