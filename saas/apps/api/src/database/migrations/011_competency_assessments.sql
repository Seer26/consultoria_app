CREATE TABLE IF NOT EXISTS competencies (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  scope TEXT NOT NULL CHECK (scope IN ('SYSTEM', 'COMPANY')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((scope = 'SYSTEM' AND company_id IS NULL)
      OR (scope = 'COMPANY' AND company_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_competencies_system_active_name
  ON competencies (LOWER(BTRIM(name))) WHERE scope = 'SYSTEM' AND status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS idx_competencies_company_active_name
  ON competencies (company_id, LOWER(BTRIM(name))) WHERE scope = 'COMPANY' AND status = 'ACTIVE';
-- Also supports catalog queries including inactive entries and the company FK.
CREATE INDEX IF NOT EXISTS idx_competencies_company_status
  ON competencies (company_id, status);

CREATE TABLE IF NOT EXISTS competency_assessments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  subject_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  started_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  completed_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  subject_name_snapshot TEXT NOT NULL,
  started_by_name_snapshot TEXT NOT NULL,
  completed_by_name_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  CHECK ((status = 'IN_PROGRESS' AND completed_at IS NULL)
      OR (status = 'COMPLETED' AND completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_competency_assessments_company_subject_history
  ON competency_assessments (company_id, subject_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_competency_assessments_company_subject_in_progress
  ON competency_assessments (company_id, subject_user_id) WHERE status = 'IN_PROGRESS';
CREATE INDEX IF NOT EXISTS idx_competency_assessments_started_by
  ON competency_assessments (started_by_user_id);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_completed_by
  ON competency_assessments (completed_by_user_id);
-- Subject can move companies; historical lookup and the FK still need a leading user index.
CREATE INDEX IF NOT EXISTS idx_competency_assessments_subject
  ON competency_assessments (subject_user_id);

CREATE TABLE IF NOT EXISTS competency_assessment_items (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES competency_assessments(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  competency_name_snapshot TEXT NOT NULL,
  competency_description_snapshot TEXT NOT NULL,
  competency_category_snapshot TEXT,
  competency_scope_snapshot TEXT NOT NULL CHECK (competency_scope_snapshot IN ('SYSTEM', 'COMPANY')),
  evidence_status TEXT NOT NULL CHECK (evidence_status IN ('NOT_OBSERVED', 'RATED')),
  level INTEGER,
  observation TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (assessment_id, competency_id),
  CHECK ((evidence_status = 'NOT_OBSERVED' AND level IS NULL)
      OR (evidence_status = 'RATED' AND level IS NOT NULL AND level BETWEEN 1 AND 5))
);
CREATE INDEX IF NOT EXISTS idx_competency_assessment_items_competency
  ON competency_assessment_items (competency_id);

CREATE OR REPLACE FUNCTION guard_competency_assessment_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.status = 'COMPLETED' THEN
      RAISE EXCEPTION 'COMPLETED_COMPETENCY_ASSESSMENT_IS_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  -- UPDATE already owns the header row lock. Items acquire this same lock before writes.
  -- Direct insertion of an empty completed header is rejected as well.
  IF NEW.status = 'COMPLETED' AND NOT EXISTS (
    SELECT 1 FROM competency_assessment_items WHERE assessment_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'COMPETENCY_ASSESSMENT_REQUIRES_AT_LEAST_ONE_ITEM' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_competency_assessment_item_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  previous_assessment_id TEXT;
  next_assessment_id TEXT;
  header RECORD;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    previous_assessment_id := OLD.assessment_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    next_assessment_id := NEW.assessment_id;
  END IF;
  -- Lock both links in stable order: movement must not bypass either completed header.
  -- Locking drafts too serializes item writes with finalization, including direct SQL.
  FOR header IN
    SELECT id, status FROM competency_assessments
    WHERE id IN (previous_assessment_id, next_assessment_id)
    ORDER BY id FOR UPDATE
  LOOP
    IF header.status = 'COMPLETED' THEN
      RAISE EXCEPTION 'COMPLETED_COMPETENCY_ASSESSMENT_ITEMS_ARE_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Reapplication replaces only the guards, preserving catalog and historical data.
DROP TRIGGER IF EXISTS trg_competency_assessment_history ON competency_assessments;
CREATE TRIGGER trg_competency_assessment_history
  BEFORE INSERT OR UPDATE OR DELETE ON competency_assessments
  FOR EACH ROW EXECUTE FUNCTION guard_competency_assessment_history();
DROP TRIGGER IF EXISTS trg_competency_assessment_item_history ON competency_assessment_items;
CREATE TRIGGER trg_competency_assessment_item_history
  BEFORE INSERT OR UPDATE OR DELETE ON competency_assessment_items
  FOR EACH ROW EXECUTE FUNCTION guard_competency_assessment_item_history();

-- Stable IDs define the approved SYSTEM V1; reruns never overwrite catalog or snapshots.
INSERT INTO competencies (id, company_id, scope, name, description, category, status, created_at, updated_at)
VALUES
  ('competency-v1-01', NULL, 'SYSTEM', 'Comunicação profissional', 'Transmite informações de trabalho com clareza, contexto e objetividade.', 'Comunicação', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-02', NULL, 'SYSTEM', 'Organização e planejamento do trabalho', 'Estrutura atividades, etapas, prazos e recursos necessários.', 'Execução', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-03', NULL, 'SYSTEM', 'Gestão de prioridades', 'Identifica o que exige atenção e sequencia atividades de forma adequada.', 'Execução', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-04', NULL, 'SYSTEM', 'Execução de processos e rotinas', 'Realiza atividades seguindo procedimentos, critérios e prazos definidos.', 'Execução', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-05', NULL, 'SYSTEM', 'Qualidade e atenção aos detalhes', 'Verifica informações e entregas antes de concluir uma atividade.', 'Qualidade', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-06', NULL, 'SYSTEM', 'Resolução de problemas', 'Identifica causas, avalia alternativas e encaminha soluções viáveis.', 'Análise', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-07', NULL, 'SYSTEM', 'Análise e interpretação de informações', 'Usa dados, documentos e evidências para apoiar decisões.', 'Análise', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-08', NULL, 'SYSTEM', 'Uso de ferramentas e sistemas de trabalho', 'Utiliza adequadamente ferramentas, sistemas e recursos necessários à função.', 'Técnica', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-09', NULL, 'SYSTEM', 'Aplicação de conhecimento técnico', 'Emprega conhecimentos próprios da atividade para executar entregas corretas.', 'Técnica', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-10', NULL, 'SYSTEM', 'Registro e documentação', 'Mantém registros, evidências e documentação necessários ao trabalho.', 'Qualidade', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-11', NULL, 'SYSTEM', 'Atendimento e orientação ao cliente', 'Compreende a necessidade apresentada e conduz o atendimento de cliente interno ou externo de forma adequada.', 'Relacionamento profissional', 'ACTIVE', NOW()::text, NOW()::text),
  ('competency-v1-12', NULL, 'SYSTEM', 'Coordenação de atividades', 'Distribui, acompanha e integra atividades quando há responsabilidade de coordenação.', 'Gestão', 'ACTIVE', NOW()::text, NOW()::text)
ON CONFLICT (id) DO NOTHING;
