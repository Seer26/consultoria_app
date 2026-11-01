CREATE TABLE IF NOT EXISTS behavioral_questionnaires (
  version INTEGER PRIMARY KEY,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS behavioral_questions (
  id TEXT PRIMARY KEY,
  questionnaire_version INTEGER NOT NULL REFERENCES behavioral_questionnaires(version),
  dimension TEXT NOT NULL CHECK (dimension IN ('EXECUTOR', 'COMUNICADOR', 'PLANEJADOR', 'ANALITICO')),
  text TEXT NOT NULL,
  is_reverse BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(questionnaire_version, position)
);

CREATE TABLE IF NOT EXISTS behavioral_assessments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
  questionnaire_version INTEGER NOT NULL REFERENCES behavioral_questionnaires(version),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS behavioral_answers (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES behavioral_assessments(id),
  question_id TEXT NOT NULL REFERENCES behavioral_questions(id),
  value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(assessment_id, question_id)
);

CREATE TABLE IF NOT EXISTS behavioral_results (
  assessment_id TEXT PRIMARY KEY REFERENCES behavioral_assessments(id),
  executor_score INTEGER NOT NULL CHECK (executor_score BETWEEN 0 AND 100),
  comunicador_score INTEGER NOT NULL CHECK (comunicador_score BETWEEN 0 AND 100),
  planejador_score INTEGER NOT NULL CHECK (planejador_score BETWEEN 0 AND 100),
  analitico_score INTEGER NOT NULL CHECK (analitico_score BETWEEN 0 AND 100),
  predominant_dimension TEXT CHECK (predominant_dimension IN ('EXECUTOR', 'COMUNICADOR', 'PLANEJADOR', 'ANALITICO')),
  calculated_at TEXT NOT NULL
);

-- The question UNIQUE constraint also indexes (questionnaire_version, position).
CREATE INDEX IF NOT EXISTS idx_behavioral_assessments_company_user_history
  ON behavioral_assessments(company_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_assessments_company_status
  ON behavioral_assessments(company_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_behavioral_assessments_user_in_progress
  ON behavioral_assessments(user_id) WHERE status = 'IN_PROGRESS';

-- Never update an existing version: historical assessments retain their catalog.
INSERT INTO behavioral_questionnaires (version, active, created_at)
VALUES (1, TRUE, NOW()::text)
ON CONFLICT (version) DO NOTHING;

INSERT INTO behavioral_questions (id, questionnaire_version, dimension, text, is_reverse, position, active)
VALUES
  ('behavioral-v1-01', 1, 'EXECUTOR', 'Quando surge uma pendência e ainda faltam alguns detalhes, procuro identificar o que já pode ser feito para avançar.', FALSE, 1, TRUE),
  ('behavioral-v1-02', 1, 'EXECUTOR', 'Em atividades longas, mantenho o ritmo ao dividir o trabalho em entregas menores.', FALSE, 2, TRUE),
  ('behavioral-v1-03', 1, 'EXECUTOR', 'Prefiro esperar que alguém defina todos os detalhes antes de iniciar uma tarefa sob minha responsabilidade.', TRUE, 3, TRUE),
  ('behavioral-v1-04', 1, 'EXECUTOR', 'Quando encontro um obstáculo durante uma tarefa, procuro uma alternativa prática para continuar avançando.', FALSE, 4, TRUE),
  ('behavioral-v1-05', 1, 'EXECUTOR', 'Tenho facilidade para transformar uma intenção em próximos passos concretos.', FALSE, 5, TRUE),
  ('behavioral-v1-06', 1, 'COMUNICADOR', 'Ao explicar um assunto, ajusto minha linguagem conforme a pessoa com quem falo.', FALSE, 6, TRUE),
  ('behavioral-v1-07', 1, 'COMUNICADOR', 'Em reuniões, procuro verificar se as pessoas entenderam o que foi combinado antes de avançar.', FALSE, 7, TRUE),
  ('behavioral-v1-08', 1, 'COMUNICADOR', 'Costumo deixar conversas importantes para depois quando antecipo opiniões diferentes.', TRUE, 8, TRUE),
  ('behavioral-v1-09', 1, 'COMUNICADOR', 'Consigo apresentar uma discordância de forma respeitosa e direta.', FALSE, 9, TRUE),
  ('behavioral-v1-10', 1, 'COMUNICADOR', 'Quando percebo que uma explicação não ficou clara, procuro apresentá-la de outra forma.', FALSE, 10, TRUE),
  ('behavioral-v1-11', 1, 'PLANEJADOR', 'Antes de começar uma demanda com várias etapas, organizo uma sequência de trabalho e prioridades.', FALSE, 11, TRUE),
  ('behavioral-v1-12', 1, 'PLANEJADOR', 'Reviso prazos e dependências quando surgem mudanças no trabalho.', FALSE, 12, TRUE),
  ('behavioral-v1-13', 1, 'PLANEJADOR', 'Frequentemente começo tarefas sem reservar tempo para organizar o que precisa ser feito.', TRUE, 13, TRUE),
  ('behavioral-v1-14', 1, 'PLANEJADOR', 'Quando há várias urgências, defino critérios para decidir o que vem primeiro.', FALSE, 14, TRUE),
  ('behavioral-v1-15', 1, 'PLANEJADOR', 'Costumo acompanhar se o que foi combinado está avançando como previsto.', FALSE, 15, TRUE),
  ('behavioral-v1-16', 1, 'ANALITICO', 'Antes de concluir algo relevante, comparo informações de fontes diferentes quando isso pode mudar a decisão.', FALSE, 16, TRUE),
  ('behavioral-v1-17', 1, 'ANALITICO', 'Costumo identificar padrões ao comparar resultados ocorridos em momentos diferentes.', FALSE, 17, TRUE),
  ('behavioral-v1-18', 1, 'ANALITICO', 'Tendo a aceitar a primeira explicação plausível sem checar outros fatores.', TRUE, 18, TRUE),
  ('behavioral-v1-19', 1, 'ANALITICO', 'Quando um número ou indicador parece fora do esperado, procuro entender o que pode explicá-lo.', FALSE, 19, TRUE),
  ('behavioral-v1-20', 1, 'ANALITICO', 'Em problemas complexos, separo fatos, hipóteses e opiniões antes de decidir.', FALSE, 20, TRUE)
ON CONFLICT (questionnaire_version, position) DO NOTHING;
