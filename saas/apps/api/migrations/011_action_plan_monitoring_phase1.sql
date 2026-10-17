-- Executed once, atomically, by migrateActionPlanMonitoring(). Never run on its own.
CREATE UNIQUE INDEX IF NOT EXISTS users_id_company ON users(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS submissions_id_company ON diagnosis_submissions(id, company_id);
CREATE TABLE action_plans (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  submission_id TEXT,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK(status IN ('RASCUNHO','ATIVO','CONCLUIDO','CANCELADO')),
  start_date TEXT,
  due_date TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, company_id),
  FOREIGN KEY(submission_id,company_id) REFERENCES diagnosis_submissions(id,company_id)
);
INSERT INTO action_plans(id,company_id,submission_id,title,description,status,created_by,created_at,updated_at)
SELECT 'legacy-' || hex(company_id) || '-' || CASE WHEN submission_id IS NULL THEN 'none' ELSE hex(submission_id) END,company_id,submission_id,
  'Plano de ação migrado','Tarefas preservadas da versão anterior.','ATIVO',
  (SELECT id FROM users u WHERE u.company_id=t.company_id ORDER BY u.created_at LIMIT 1),
  MIN(created_at),MAX(updated_at)
FROM action_plan_tasks t GROUP BY company_id,submission_id;
CREATE TABLE action_plan_tasks_phase1 (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  plan_id TEXT NOT NULL,
  submission_id TEXT,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  pillar TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIA' CHECK(priority IN ('BAIXA','MEDIA','ALTA','CRITICA')),
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE','EM_ANDAMENTO','AGUARDANDO_VALIDACAO','CONCLUIDA','CANCELADA')),
  start_date TEXT,
  due_date TEXT,
  responsible_user_id TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK(typeof(progress)='integer' AND progress BETWEEN 0 AND 100),
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'MANUAL',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK((status='CONCLUIDA' AND progress=100 AND completed_at IS NOT NULL) OR (status<>'CONCLUIDA' AND completed_at IS NULL)),
  UNIQUE(id,company_id),
  FOREIGN KEY(plan_id,company_id) REFERENCES action_plans(id,company_id),
  FOREIGN KEY(submission_id,company_id) REFERENCES diagnosis_submissions(id,company_id),
  FOREIGN KEY(responsible_user_id,company_id) REFERENCES users(id,company_id)
);
INSERT INTO action_plan_tasks_phase1
(id,company_id,plan_id,submission_id,title,description,pillar,priority,status,due_date,responsible_user_id,progress,source,created_at,updated_at,completed_at)
SELECT id,company_id,'legacy-' || hex(company_id) || '-' || CASE WHEN submission_id IS NULL THEN 'none' ELSE hex(submission_id) END,submission_id,title,description,pillar,
CASE priority WHEN 'LOW' THEN 'BAIXA' WHEN 'MEDIUM' THEN 'MEDIA' WHEN 'HIGH' THEN 'ALTA' WHEN 'CRITICAL' THEN 'CRITICA' ELSE priority END,
CASE status WHEN 'TODO' THEN 'PENDENTE' WHEN 'IN_PROGRESS' THEN 'EM_ANDAMENTO' WHEN 'DONE' THEN 'CONCLUIDA' WHEN 'CANCELED' THEN 'CANCELADA' ELSE status END,
due_date,responsible_user_id,CASE WHEN status IN ('DONE','CONCLUIDA') THEN 100 ELSE 0 END,source,created_at,updated_at,
CASE WHEN status IN ('DONE','CONCLUIDA') THEN COALESCE(completed_at,updated_at) ELSE NULL END
FROM action_plan_tasks;
DROP TABLE action_plan_tasks;
ALTER TABLE action_plan_tasks_phase1 RENAME TO action_plan_tasks;
CREATE INDEX action_plan_tasks_company_plan ON action_plan_tasks(company_id,plan_id);
CREATE INDEX action_plan_tasks_company_responsible ON action_plan_tasks(company_id,responsible_user_id);
CREATE TABLE action_plan_evidence (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('COMENTARIO','LINK')),
  content TEXT NOT NULL CHECK(length(trim(content)) BETWEEN 1 AND 4000),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  FOREIGN KEY(task_id,company_id) REFERENCES action_plan_tasks(id,company_id)
);
CREATE TABLE action_plan_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  event TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id),
  actor_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(task_id,company_id) REFERENCES action_plan_tasks(id,company_id)
);
CREATE INDEX action_plan_evidence_task ON action_plan_evidence(company_id,task_id,created_at);
CREATE INDEX action_plan_history_task ON action_plan_history(company_id,task_id,created_at);
-- Existing records retain their original timestamps. Historical actors before this migration are unknown.
INSERT INTO action_plan_history(id,task_id,company_id,event,actor_name,new_value,created_at)
SELECT 'migration-'||id,id,company_id,'MIGRACAO','Migração de dados',json_object('status',status,'progress',progress),updated_at FROM action_plan_tasks;
