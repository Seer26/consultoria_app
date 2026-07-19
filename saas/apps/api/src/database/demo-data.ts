import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { schemaStatements } from '../db/schema';

export const DEMO_DATA_IDS = {
  company: 'demo-presentation-company',
  admin: 'demo-presentation-admin',
  owner: 'demo-presentation-owner',
  employee: 'demo-presentation-employee',
  employeeTwo: 'demo-presentation-employee-two',
  subscription: 'demo-presentation-subscription',
  submission: 'demo-presentation-submission',
  answers: [
    'demo-presentation-answer-strategy',
    'demo-presentation-answer-finance',
    'demo-presentation-answer-process',
    'demo-presentation-answer-people',
    'demo-presentation-answer-marketing',
    'demo-presentation-answer-sales',
  ],
  tasks: [
    'demo-presentation-task-overdue',
    'demo-presentation-task-progress',
    'demo-presentation-task-due-soon',
    'demo-presentation-task-done',
  ],
} as const;

type DemoOperation = 'seed' | 'cleanup';

export interface DemoDataConfig {
  databasePath: string;
  adminEmail?: string;
  adminPassword?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  employeeEmail?: string;
  employeePassword?: string;
  employeeTwoEmail?: string;
  employeeTwoPassword?: string;
}

function required(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name}_REQUIRED`);
  return normalized;
}

function validateEmail(name: string, value: string | undefined): string {
  const email = required(name, value).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(`${name}_MUST_BE_A_VALID_EMAIL`);
  }
  return email;
}

function validatePassword(name: string, value: string | undefined): string {
  const password = required(name, value);
  if (password.length < 12) {
    throw new Error(`${name}_MUST_HAVE_AT_LEAST_12_CHARACTERS`);
  }
  if (
    /^(123456|password|senha|admin|demo)/i.test(password) ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(`${name}_MUST_BE_STRONG_AND_NOT_PREDICTABLE`);
  }
  return password;
}

export function readDemoDataConfig(
  operation: DemoOperation,
  rawEnv: NodeJS.ProcessEnv = process.env,
): DemoDataConfig {
  if (rawEnv.APP_ENV?.trim().toLowerCase() !== 'demo') {
    throw new Error('DEMO_DATA_COMMAND_REQUIRES_APP_ENV_DEMO');
  }
  if (rawEnv.NODE_ENV?.trim().toLowerCase() !== 'development') {
    throw new Error('DEMO_DATA_COMMAND_REQUIRES_NODE_ENV_DEVELOPMENT');
  }
  if (rawEnv.ENABLE_DEMO_SEED?.trim().toLowerCase() !== 'false') {
    throw new Error('DEMO_DATA_COMMAND_REQUIRES_ENABLE_DEMO_SEED_FALSE');
  }
  if (rawEnv.DATABASE_URL?.trim()) {
    throw new Error('DEMO_DATA_COMMAND_SUPPORTS_ISOLATED_SQLITE_ONLY');
  }

  const databasePath = path.resolve(required('DATABASE_PATH', rawEnv.DATABASE_PATH));
  if (!['.sqlite', '.sqlite3', '.db'].includes(path.extname(databasePath).toLowerCase())) {
    throw new Error('DEMO_DATA_DATABASE_PATH_MUST_BE_A_SQLITE_FILE');
  }
  if (!path.basename(databasePath).toLowerCase().includes('demo')) {
    throw new Error('DEMO_DATA_DATABASE_FILENAME_MUST_CONTAIN_DEMO');
  }
  if (path.dirname(databasePath) === path.parse(databasePath).root) {
    throw new Error('DEMO_DATA_DATABASE_MUST_NOT_BE_AT_FILESYSTEM_ROOT');
  }

  if (operation === 'cleanup') {
    if (
      rawEnv.DEMO_CLEANUP_CONFIRMATION !==
      'delete-only-consultoria-demo-presentation-data'
    ) {
      throw new Error('DEMO_CLEANUP_EXPLICIT_CONFIRMATION_REQUIRED');
    }
    return { databasePath };
  }

  if (
    rawEnv.DEMO_SEED_CONFIRMATION !==
    'create-consultoria-demo-presentation-data'
  ) {
    throw new Error('DEMO_SEED_EXPLICIT_CONFIRMATION_REQUIRED');
  }

  return {
    databasePath,
    adminEmail: validateEmail('DEMO_SEED_ADMIN_EMAIL', rawEnv.DEMO_SEED_ADMIN_EMAIL),
    adminPassword: validatePassword(
      'DEMO_SEED_ADMIN_PASSWORD',
      rawEnv.DEMO_SEED_ADMIN_PASSWORD,
    ),
    ownerEmail: validateEmail('DEMO_SEED_OWNER_EMAIL', rawEnv.DEMO_SEED_OWNER_EMAIL),
    ownerPassword: validatePassword(
      'DEMO_SEED_OWNER_PASSWORD',
      rawEnv.DEMO_SEED_OWNER_PASSWORD,
    ),
    employeeEmail: validateEmail(
      'DEMO_SEED_EMPLOYEE_EMAIL',
      rawEnv.DEMO_SEED_EMPLOYEE_EMAIL,
    ),
    employeePassword: validatePassword(
      'DEMO_SEED_EMPLOYEE_PASSWORD',
      rawEnv.DEMO_SEED_EMPLOYEE_PASSWORD,
    ),
    employeeTwoEmail: validateEmail(
      'DEMO_SEED_EMPLOYEE_TWO_EMAIL',
      rawEnv.DEMO_SEED_EMPLOYEE_TWO_EMAIL,
    ),
    employeeTwoPassword: validatePassword(
      'DEMO_SEED_EMPLOYEE_TWO_PASSWORD',
      rawEnv.DEMO_SEED_EMPLOYEE_TWO_PASSWORD,
    ),
  };
}

function openDatabase(databasePath: string): Database.Database {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');
  database.pragma('busy_timeout = 5000');
  for (const statement of schemaStatements) database.exec(statement);
  return database;
}

function requiredConfig(config: DemoDataConfig) {
  return {
    adminEmail: required('DEMO_SEED_ADMIN_EMAIL', config.adminEmail),
    adminPassword: required('DEMO_SEED_ADMIN_PASSWORD', config.adminPassword),
    ownerEmail: required('DEMO_SEED_OWNER_EMAIL', config.ownerEmail),
    ownerPassword: required('DEMO_SEED_OWNER_PASSWORD', config.ownerPassword),
    employeeEmail: required('DEMO_SEED_EMPLOYEE_EMAIL', config.employeeEmail),
    employeePassword: required('DEMO_SEED_EMPLOYEE_PASSWORD', config.employeePassword),
    employeeTwoEmail: required(
      'DEMO_SEED_EMPLOYEE_TWO_EMAIL',
      config.employeeTwoEmail,
    ),
    employeeTwoPassword: required(
      'DEMO_SEED_EMPLOYEE_TWO_PASSWORD',
      config.employeeTwoPassword,
    ),
  };
}

export async function seedDemoData(config: DemoDataConfig): Promise<void> {
  const credentials = requiredConfig(config);
  const hashes = await Promise.all([
    bcrypt.hash(credentials.adminPassword, 10),
    bcrypt.hash(credentials.ownerPassword, 10),
    bcrypt.hash(credentials.employeePassword, 10),
    bcrypt.hash(credentials.employeeTwoPassword, 10),
  ]);
  const database = openDatabase(config.databasePath);
  const now = new Date();
  const timestamp = now.toISOString();
  const createdAt = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const completedAt = new Date(now.getTime() - 12 * 86_400_000).toISOString();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  ).toISOString();

  try {
    database.transaction(() => {
      database
        .prepare(
          `
          INSERT INTO companies (
            id, name, slug, status, sector, size, phone, responsible_name,
            notes, created_at, updated_at
          ) VALUES (
            @id, 'Empresa Horizonte Consultoria Demo',
            'empresa-horizonte-consultoria-demo', 'ACTIVE', 'Consultoria empresarial',
            'SMB', '(11) 4000-2026', 'Marina Horizonte',
            'Cenário inteiramente sintético para apresentação comercial.',
            @createdAt, @updatedAt
          )
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            status = excluded.status,
            sector = excluded.sector,
            size = excluded.size,
            phone = excluded.phone,
            responsible_name = excluded.responsible_name,
            notes = excluded.notes,
            updated_at = excluded.updated_at
          `,
        )
        .run({
          id: DEMO_DATA_IDS.company,
          createdAt,
          updatedAt: timestamp,
        });

      const upsertUser = database.prepare(`
        INSERT INTO users (
          id, name, email, password_hash, role, company_id,
          created_at, updated_at, status, auth_version
        ) VALUES (
          @id, @name, @email, @passwordHash, @role, @companyId,
          @createdAt, @updatedAt, 'ACTIVE', 0
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          password_hash = excluded.password_hash,
          role = excluded.role,
          company_id = excluded.company_id,
          updated_at = excluded.updated_at,
          status = 'ACTIVE',
          auth_version = users.auth_version + 1
      `);
      [
        [
          DEMO_DATA_IDS.admin,
          'Administrador da Demonstração',
          credentials.adminEmail,
          hashes[0],
          'ADMIN',
          null,
        ],
        [
          DEMO_DATA_IDS.owner,
          'Marina Horizonte',
          credentials.ownerEmail,
          hashes[1],
          'OWNER',
          DEMO_DATA_IDS.company,
        ],
        [
          DEMO_DATA_IDS.employee,
          'Rafael Operações',
          credentials.employeeEmail,
          hashes[2],
          'EMPLOYEE',
          DEMO_DATA_IDS.company,
        ],
        [
          DEMO_DATA_IDS.employeeTwo,
          'Camila Comercial',
          credentials.employeeTwoEmail,
          hashes[3],
          'EMPLOYEE',
          DEMO_DATA_IDS.company,
        ],
      ].forEach(([id, name, email, passwordHash, role, companyId]) => {
        upsertUser.run({
          id,
          name,
          email,
          passwordHash,
          role,
          companyId,
          createdAt,
          updatedAt: timestamp,
        });
      });

      database
        .prepare(
          `
          INSERT INTO plans (
            id, slug, name, description, status, max_users,
            max_research_submissions_monthly, max_report_pdfs_monthly,
            max_active_action_tasks, max_ai_questions_monthly,
            created_at, updated_at
          ) VALUES (
            'plan-growth', 'growth', 'Growth',
            'Plano intermediário preparado para clientes beta.', 'ACTIVE',
            20, 100, 150, 500, 500, @now, @now
          )
          ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
          `,
        )
        .run({ now: timestamp });
      database
        .prepare(
          `
          INSERT INTO company_subscriptions (
            id, company_id, plan_id, status, current_period_start,
            current_period_end, created_at, updated_at
          ) VALUES (
            @id, @companyId, 'plan-growth', 'ACTIVE', @periodStart,
            @periodEnd, @createdAt, @updatedAt
          )
          ON CONFLICT(company_id) DO UPDATE SET
            plan_id = excluded.plan_id,
            status = excluded.status,
            current_period_start = excluded.current_period_start,
            current_period_end = excluded.current_period_end,
            updated_at = excluded.updated_at
          `,
        )
        .run({
          id: DEMO_DATA_IDS.subscription,
          companyId: DEMO_DATA_IDS.company,
          periodStart,
          periodEnd,
          createdAt,
          updatedAt: timestamp,
        });

      const pillarScores = [
        { pillar: 'Estratégia', score: 76, answersCount: 1, maturity: 'good' },
        { pillar: 'Financeiro', score: 44, answersCount: 1, maturity: 'attention' },
        { pillar: 'Processos', score: 51, answersCount: 1, maturity: 'attention' },
        { pillar: 'Pessoas/RH', score: 68, answersCount: 1, maturity: 'intermediate' },
        { pillar: 'Marketing', score: 71, answersCount: 1, maturity: 'intermediate' },
        { pillar: 'Comercial', score: 82, answersCount: 1, maturity: 'good' },
      ];
      database
        .prepare(
          `
          INSERT INTO diagnosis_submissions (
            id, company_id, user_id, submission_type, questionnaire_id,
            respondent_role, department, status, overall_score, summary,
            critical_points, opportunities, recommendations, next_steps,
            pillar_scores, created_at, updated_at, completed_at
          ) VALUES (
            @id, @companyId, @ownerId, 'RESEARCH', 'demo-presentation-research',
            'Diretora executiva', 'Direção', 'COMPLETED', 65.3, @summary,
            @criticalPoints, @opportunities, @recommendations, @nextSteps,
            @pillarScores, @createdAt, @completedAt, @completedAt
          )
          ON CONFLICT(id) DO UPDATE SET
            overall_score = excluded.overall_score,
            summary = excluded.summary,
            critical_points = excluded.critical_points,
            opportunities = excluded.opportunities,
            recommendations = excluded.recommendations,
            next_steps = excluded.next_steps,
            pillar_scores = excluded.pillar_scores,
            updated_at = excluded.updated_at,
            completed_at = excluded.completed_at
          `,
        )
        .run({
          id: DEMO_DATA_IDS.submission,
          companyId: DEMO_DATA_IDS.company,
          ownerId: DEMO_DATA_IDS.owner,
          summary:
            'A Horizonte possui boa tração comercial e direcionamento estratégico. O próximo salto depende de previsibilidade financeira e padronização operacional.',
          criticalPoints: JSON.stringify([
            'Fluxo de caixa ainda não orienta decisões semanais.',
            'Processos críticos dependem de conhecimento informal.',
          ]),
          opportunities: JSON.stringify([
            'Carteira comercial recorrente com boa taxa de conversão.',
            'Equipe aberta a rituais objetivos de gestão.',
          ]),
          recommendations: JSON.stringify([
            'Implantar rotina semanal de fluxo de caixa com responsável e indicadores.',
            'Documentar os três processos operacionais de maior impacto.',
          ]),
          nextSteps: JSON.stringify([
            'Tratar imediatamente a pendência financeira atrasada.',
            'Concluir o mapa de processos nos próximos sete dias.',
            'Reavaliar scores e execução do plano em trinta dias.',
          ]),
          pillarScores: JSON.stringify(pillarScores),
          createdAt,
          completedAt,
        });

      const upsertAnswer = database.prepare(`
        INSERT INTO diagnosis_answers (
          id, submission_id, question_id, question, answer, pillar,
          value, score, created_at
        ) VALUES (
          @id, @submissionId, @questionId, @question, @answer, @pillar,
          @score, @score, @createdAt
        )
        ON CONFLICT(id) DO UPDATE SET
          question = excluded.question,
          answer = excluded.answer,
          pillar = excluded.pillar,
          value = excluded.value,
          score = excluded.score
      `);
      const answers = [
        ['Estratégia', 'As prioridades estratégicas estão claras?', 'Sim, com revisão trimestral.', 76],
        ['Financeiro', 'Como a empresa acompanha o fluxo de caixa?', 'Há planilha mensal, mas falta ritual semanal.', 44],
        ['Processos', 'Os processos principais estão documentados?', 'Apenas parte do atendimento está formalizada.', 51],
        ['Pessoas/RH', 'Como a equipe recebe metas e feedback?', 'Metas mensais e feedback ainda irregular.', 68],
        ['Marketing', 'As ações de marketing são medidas?', 'Campanhas possuem calendário e conversão acompanhada.', 71],
        ['Comercial', 'Como o time acompanha oportunidades?', 'O funil é revisado toda semana e possui metas claras.', 82],
      ] as const;
      answers.forEach(([pillar, question, answer, score], index) => {
        upsertAnswer.run({
          id: DEMO_DATA_IDS.answers[index],
          submissionId: DEMO_DATA_IDS.submission,
          questionId: `demo-presentation-question-${index + 1}`,
          question,
          answer,
          pillar,
          score,
          createdAt,
        });
      });

      const upsertTask = database.prepare(`
        INSERT INTO action_plan_tasks (
          id, company_id, submission_id, title, description, pillar,
          priority, status, due_date, responsible_user_id, source,
          created_at, updated_at, completed_at
        ) VALUES (
          @id, @companyId, @submissionId, @title, @description, @pillar,
          @priority, @status, @dueDate, @responsibleUserId,
          'RESEARCH_RECOMMENDATION', @createdAt, @updatedAt, @completedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          pillar = excluded.pillar,
          priority = excluded.priority,
          status = excluded.status,
          due_date = excluded.due_date,
          responsible_user_id = excluded.responsible_user_id,
          updated_at = excluded.updated_at,
          completed_at = excluded.completed_at
      `);
      [
        {
          id: DEMO_DATA_IDS.tasks[0],
          title: 'Implantar rotina semanal de fluxo de caixa',
          description: 'Definir o modelo, o responsável e a reunião semanal de acompanhamento.',
          pillar: 'Financeiro',
          priority: 'CRITICAL',
          status: 'TODO',
          dueDate: new Date(now.getTime() - 4 * 86_400_000).toISOString(),
          responsibleUserId: DEMO_DATA_IDS.owner,
          completedAt: null,
        },
        {
          id: DEMO_DATA_IDS.tasks[1],
          title: 'Mapear processos operacionais prioritários',
          description: 'Documentar entradas, responsáveis, etapas e indicadores.',
          pillar: 'Processos',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          dueDate: new Date(now.getTime() + 5 * 86_400_000).toISOString(),
          responsibleUserId: DEMO_DATA_IDS.employee,
          completedAt: null,
        },
        {
          id: DEMO_DATA_IDS.tasks[2],
          title: 'Revisar indicadores do funil comercial',
          description: 'Validar conversão, ciclo médio e previsibilidade da carteira.',
          pillar: 'Comercial',
          priority: 'MEDIUM',
          status: 'TODO',
          dueDate: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
          responsibleUserId: DEMO_DATA_IDS.employeeTwo,
          completedAt: null,
        },
        {
          id: DEMO_DATA_IDS.tasks[3],
          title: 'Formalizar reunião semanal de liderança',
          description: 'Definir pauta, participantes e registro das decisões.',
          pillar: 'Estratégia',
          priority: 'MEDIUM',
          status: 'DONE',
          dueDate: completedAt,
          responsibleUserId: DEMO_DATA_IDS.owner,
          completedAt,
        },
      ].forEach((task) => {
        upsertTask.run({
          ...task,
          companyId: DEMO_DATA_IDS.company,
          submissionId: DEMO_DATA_IDS.submission,
          createdAt: completedAt,
          updatedAt: timestamp,
        });
      });
    })();
  } finally {
    database.close();
  }
}

export function cleanupDemoData(config: DemoDataConfig): void {
  if (!fs.existsSync(config.databasePath)) {
    throw new Error('DEMO_CLEANUP_DATABASE_NOT_FOUND');
  }
  const database = openDatabase(config.databasePath);
  try {
    database.transaction(() => {
      const deleteTask = database.prepare('DELETE FROM action_plan_tasks WHERE id = ?');
      DEMO_DATA_IDS.tasks.forEach((id) => deleteTask.run(id));
      const deleteAnswer = database.prepare('DELETE FROM diagnosis_answers WHERE id = ?');
      DEMO_DATA_IDS.answers.forEach((id) => deleteAnswer.run(id));
      database
        .prepare('DELETE FROM diagnosis_submissions WHERE id = ?')
        .run(DEMO_DATA_IDS.submission);
      database
        .prepare('DELETE FROM usage_counters WHERE company_id = ?')
        .run(DEMO_DATA_IDS.company);
      database
        .prepare('DELETE FROM company_subscription_events WHERE company_id = ?')
        .run(DEMO_DATA_IDS.company);
      database
        .prepare(
          `DELETE FROM legal_acceptances
           WHERE user_id IN (?, ?, ?, ?)`,
        )
        .run(
          DEMO_DATA_IDS.admin,
          DEMO_DATA_IDS.owner,
          DEMO_DATA_IDS.employee,
          DEMO_DATA_IDS.employeeTwo,
        );
      database
        .prepare(
          `DELETE FROM password_reset_tokens
           WHERE user_id IN (?, ?, ?, ?)`,
        )
        .run(
          DEMO_DATA_IDS.admin,
          DEMO_DATA_IDS.owner,
          DEMO_DATA_IDS.employee,
          DEMO_DATA_IDS.employeeTwo,
        );
      database
        .prepare('DELETE FROM company_subscriptions WHERE company_id = ?')
        .run(DEMO_DATA_IDS.company);
      const deleteUser = database.prepare('DELETE FROM users WHERE id = ?');
      deleteUser.run(DEMO_DATA_IDS.employeeTwo);
      deleteUser.run(DEMO_DATA_IDS.employee);
      deleteUser.run(DEMO_DATA_IDS.owner);
      deleteUser.run(DEMO_DATA_IDS.admin);
      database
        .prepare('DELETE FROM companies WHERE id = ?')
        .run(DEMO_DATA_IDS.company);
    })();
  } finally {
    database.close();
  }
}
