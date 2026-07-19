import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { schemaStatements } from '../db/schema';

export const STAGING_DATA_IDS = {
  company: 'staging-synthetic-company',
  admin: 'staging-synthetic-admin',
  owner: 'staging-synthetic-owner',
  employee: 'staging-synthetic-employee',
  subscription: 'staging-synthetic-subscription',
  submission: 'staging-synthetic-submission',
  answers: [
    'staging-synthetic-answer-finance',
    'staging-synthetic-answer-process',
    'staging-synthetic-answer-people',
  ],
  tasks: [
    'staging-synthetic-task-finance',
    'staging-synthetic-task-process',
  ],
} as const;

export type StagingDataOperation = 'seed' | 'cleanup';

export interface StagingDataConfig {
  databasePath: string;
  adminEmail?: string;
  adminPassword?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  employeeEmail?: string;
  employeePassword?: string;
}

function required(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name}_REQUIRED`);
  return normalized;
}

function validatePassword(name: string, value: string | undefined): string {
  const password = required(name, value);
  if (password.length < 12) throw new Error(`${name}_MUST_HAVE_AT_LEAST_12_CHARACTERS`);
  if (/^(123456|password|senha|admin|staging)/i.test(password)) {
    throw new Error(`${name}_IS_TOO_PREDICTABLE`);
  }
  return password;
}

function validateEmail(name: string, value: string | undefined): string {
  const email = required(name, value).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(`${name}_MUST_BE_A_VALID_EMAIL`);
  }
  return email;
}

export function readStagingDataConfig(
  operation: StagingDataOperation,
  rawEnv: NodeJS.ProcessEnv = process.env,
): StagingDataConfig {
  if (rawEnv.APP_ENV?.trim().toLowerCase() !== 'staging') {
    throw new Error('STAGING_DATA_COMMAND_REQUIRES_APP_ENV_STAGING');
  }
  if (rawEnv.NODE_ENV?.trim().toLowerCase() !== 'production') {
    throw new Error('STAGING_DATA_COMMAND_REQUIRES_NODE_ENV_PRODUCTION');
  }
  if (rawEnv.ENABLE_DEMO_SEED?.trim().toLowerCase() !== 'false') {
    throw new Error('STAGING_DATA_COMMAND_REQUIRES_ENABLE_DEMO_SEED_FALSE');
  }
  if (rawEnv.DATABASE_URL?.trim()) {
    throw new Error('STAGING_DATA_COMMAND_SUPPORTS_SQLITE_ONLY');
  }

  const databasePath = required('DATABASE_PATH', rawEnv.DATABASE_PATH);
  if (!path.isAbsolute(databasePath)) {
    throw new Error('STAGING_DATA_DATABASE_PATH_MUST_BE_ABSOLUTE');
  }
  if (!['.sqlite', '.sqlite3', '.db'].includes(path.extname(databasePath).toLowerCase())) {
    throw new Error('STAGING_DATA_DATABASE_PATH_MUST_BE_A_SQLITE_FILE');
  }
  if (path.dirname(path.resolve(databasePath)) === path.parse(databasePath).root) {
    throw new Error('STAGING_DATA_DATABASE_MUST_NOT_BE_STORED_AT_FILESYSTEM_ROOT');
  }

  if (operation === 'cleanup') {
    if (
      rawEnv.STAGING_CLEANUP_CONFIRMATION !==
      'delete-only-consultoria-staging-synthetic-data'
    ) {
      throw new Error('STAGING_CLEANUP_EXPLICIT_CONFIRMATION_REQUIRED');
    }
    return { databasePath };
  }

  if (rawEnv.STAGING_SEED_CONFIRMATION !== 'create-consultoria-staging-synthetic-data') {
    throw new Error('STAGING_SEED_EXPLICIT_CONFIRMATION_REQUIRED');
  }

  return {
    databasePath,
    adminEmail: validateEmail('STAGING_SEED_ADMIN_EMAIL', rawEnv.STAGING_SEED_ADMIN_EMAIL),
    adminPassword: validatePassword(
      'STAGING_SEED_ADMIN_PASSWORD',
      rawEnv.STAGING_SEED_ADMIN_PASSWORD,
    ),
    ownerEmail: validateEmail('STAGING_SEED_OWNER_EMAIL', rawEnv.STAGING_SEED_OWNER_EMAIL),
    ownerPassword: validatePassword(
      'STAGING_SEED_OWNER_PASSWORD',
      rawEnv.STAGING_SEED_OWNER_PASSWORD,
    ),
    employeeEmail: validateEmail(
      'STAGING_SEED_EMPLOYEE_EMAIL',
      rawEnv.STAGING_SEED_EMPLOYEE_EMAIL,
    ),
    employeePassword: validatePassword(
      'STAGING_SEED_EMPLOYEE_PASSWORD',
      rawEnv.STAGING_SEED_EMPLOYEE_PASSWORD,
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

function currentPeriod(now: Date): { start: string; end: string } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

export async function seedStagingData(config: StagingDataConfig): Promise<void> {
  const adminEmail = required('STAGING_SEED_ADMIN_EMAIL', config.adminEmail);
  const ownerEmail = required('STAGING_SEED_OWNER_EMAIL', config.ownerEmail);
  const employeeEmail = required('STAGING_SEED_EMPLOYEE_EMAIL', config.employeeEmail);
  const [adminHash, ownerHash, employeeHash] = await Promise.all([
    bcrypt.hash(required('STAGING_SEED_ADMIN_PASSWORD', config.adminPassword), 10),
    bcrypt.hash(required('STAGING_SEED_OWNER_PASSWORD', config.ownerPassword), 10),
    bcrypt.hash(required('STAGING_SEED_EMPLOYEE_PASSWORD', config.employeePassword), 10),
  ]);
  const database = openDatabase(config.databasePath);
  const now = new Date();
  const timestamp = now.toISOString();
  const period = currentPeriod(now);

  try {
    database.transaction(() => {
      database.prepare(`
        INSERT INTO companies (
          id, name, slug, status, sector, size, phone, responsible_name, notes,
          created_at, updated_at
        ) VALUES (
          @id, 'Empresa Sintetica Staging', 'empresa-sintetica-staging', 'ACTIVE',
          'Servicos', 'SMB', NULL, 'Responsavel Sintetico',
          'Dados exclusivamente sinteticos da validacao controlada de staging.',
          @now, @now
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          status = excluded.status,
          sector = excluded.sector,
          size = excluded.size,
          responsible_name = excluded.responsible_name,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `).run({ id: STAGING_DATA_IDS.company, now: timestamp });

      const upsertUser = database.prepare(`
        INSERT INTO users (
          id, name, email, password_hash, role, company_id,
          created_at, updated_at, status, auth_version
        ) VALUES (
          @id, @name, @email, @passwordHash, @role, @companyId,
          @now, @now, 'ACTIVE', 0
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          password_hash = excluded.password_hash,
          role = excluded.role,
          company_id = excluded.company_id,
          updated_at = excluded.updated_at,
          status = excluded.status,
          auth_version = users.auth_version + 1
      `);
      upsertUser.run({
        id: STAGING_DATA_IDS.admin,
        name: 'Administrador Sintetico Staging',
        email: adminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
        companyId: null,
        now: timestamp,
      });
      upsertUser.run({
        id: STAGING_DATA_IDS.owner,
        name: 'Owner Sintetico Staging',
        email: ownerEmail,
        passwordHash: ownerHash,
        role: 'OWNER',
        companyId: STAGING_DATA_IDS.company,
        now: timestamp,
      });
      upsertUser.run({
        id: STAGING_DATA_IDS.employee,
        name: 'Employee Sintetico Staging',
        email: employeeEmail,
        passwordHash: employeeHash,
        role: 'EMPLOYEE',
        companyId: STAGING_DATA_IDS.company,
        now: timestamp,
      });

      database.prepare(`
        INSERT INTO plans (
          id, slug, name, description, status, max_users,
          max_research_submissions_monthly, max_report_pdfs_monthly,
          max_active_action_tasks, max_ai_questions_monthly, created_at, updated_at
        ) VALUES (
          'plan-starter', 'starter', 'Starter',
          'Plano inicial para operacao controlada do SaaS.', 'ACTIVE',
          5, 20, 30, 100, 100, @now, @now
        )
        ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
      `).run({ now: timestamp });
      database.prepare(`
        INSERT INTO company_subscriptions (
          id, company_id, plan_id, status, current_period_start,
          current_period_end, created_at, updated_at
        ) VALUES (
          @id, @companyId, 'plan-starter', 'ACTIVE', @periodStart,
          @periodEnd, @now, @now
        )
        ON CONFLICT(company_id) DO UPDATE SET
          plan_id = excluded.plan_id,
          status = excluded.status,
          current_period_start = excluded.current_period_start,
          current_period_end = excluded.current_period_end,
          updated_at = excluded.updated_at
      `).run({
        id: STAGING_DATA_IDS.subscription,
        companyId: STAGING_DATA_IDS.company,
        periodStart: period.start,
        periodEnd: period.end,
        now: timestamp,
      });

      database.prepare(`
        INSERT INTO diagnosis_submissions (
          id, company_id, user_id, submission_type, questionnaire_id,
          respondent_role, department, status, overall_score, summary,
          critical_points, opportunities, recommendations, next_steps,
          pillar_scores, created_at, updated_at, completed_at
        ) VALUES (
          @id, @companyId, @ownerId, 'RESEARCH', 'staging-synthetic-research',
          'Direcao', 'Administrativo', 'COMPLETED', 62,
          'Cenario sintetico para validar dashboard, relatorio e PDF.',
          @criticalPoints, @opportunities, @recommendations, @nextSteps,
          @pillarScores, @now, @now, @now
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
      `).run({
        id: STAGING_DATA_IDS.submission,
        companyId: STAGING_DATA_IDS.company,
        ownerId: STAGING_DATA_IDS.owner,
        criticalPoints: JSON.stringify(['Previsibilidade financeira sintetica a melhorar.']),
        opportunities: JSON.stringify(['Rotina comercial sintetica ja estruturada.']),
        recommendations: JSON.stringify(['Formalizar fluxo de caixa e processos criticos.']),
        nextSteps: JSON.stringify(['Validar o ciclo sintetico no ambiente de staging.']),
        pillarScores: JSON.stringify([
          { pillar: 'Financeiro', score: 50, answersCount: 1, maturity: 'attention' },
          { pillar: 'Processos', score: 60, answersCount: 1, maturity: 'intermediate' },
          { pillar: 'Pessoas/RH', score: 76, answersCount: 1, maturity: 'intermediate' },
        ]),
        now: timestamp,
      });

      const upsertAnswer = database.prepare(`
        INSERT INTO diagnosis_answers (
          id, submission_id, question_id, question, answer, pillar,
          value, score, created_at
        ) VALUES (
          @id, @submissionId, @questionId, @question, @answer, @pillar,
          @score, @score, @now
        )
        ON CONFLICT(id) DO UPDATE SET
          question = excluded.question,
          answer = excluded.answer,
          pillar = excluded.pillar,
          value = excluded.value,
          score = excluded.score
      `);
      [
        [STAGING_DATA_IDS.answers[0], 'finance', 'Financeiro', 50],
        [STAGING_DATA_IDS.answers[1], 'process', 'Processos', 60],
        [STAGING_DATA_IDS.answers[2], 'people', 'Pessoas/RH', 76],
      ].forEach(([id, questionId, pillar, score]) => {
        upsertAnswer.run({
          id,
          submissionId: STAGING_DATA_IDS.submission,
          questionId: `staging-${questionId}`,
          question: `Pergunta sintetica de ${pillar}`,
          answer: `Resposta sintetica de ${pillar}`,
          pillar,
          score,
          now: timestamp,
        });
      });

      const upsertTask = database.prepare(`
        INSERT INTO action_plan_tasks (
          id, company_id, submission_id, title, description, pillar,
          priority, status, due_date, responsible_user_id, source,
          created_at, updated_at, completed_at
        ) VALUES (
          @id, @companyId, @submissionId, @title, @description, @pillar,
          @priority, @status, @dueDate, @ownerId, 'STAGING_SYNTHETIC',
          @now, @now, NULL
        )
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          priority = excluded.priority,
          status = excluded.status,
          due_date = excluded.due_date,
          responsible_user_id = excluded.responsible_user_id,
          updated_at = excluded.updated_at
      `);
      upsertTask.run({
        id: STAGING_DATA_IDS.tasks[0],
        companyId: STAGING_DATA_IDS.company,
        submissionId: STAGING_DATA_IDS.submission,
        title: 'Validar fluxo de caixa sintetico',
        description: 'Tarefa sem dados reais para validar o plano de acao.',
        pillar: 'Financeiro',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
        ownerId: STAGING_DATA_IDS.owner,
        now: timestamp,
      });
      upsertTask.run({
        id: STAGING_DATA_IDS.tasks[1],
        companyId: STAGING_DATA_IDS.company,
        submissionId: STAGING_DATA_IDS.submission,
        title: 'Documentar processo sintetico',
        description: 'Tarefa sem dados reais para validar o dashboard.',
        pillar: 'Processos',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        dueDate: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
        ownerId: STAGING_DATA_IDS.owner,
        now: timestamp,
      });
    })();
  } finally {
    database.close();
  }
}

export function cleanupStagingData(config: StagingDataConfig): void {
  if (!fs.existsSync(config.databasePath)) {
    throw new Error('STAGING_CLEANUP_DATABASE_NOT_FOUND');
  }
  const database = openDatabase(config.databasePath);
  try {
    database.transaction(() => {
      const taskDelete = database.prepare('DELETE FROM action_plan_tasks WHERE id = ?');
      STAGING_DATA_IDS.tasks.forEach((id) => taskDelete.run(id));
      const answerDelete = database.prepare('DELETE FROM diagnosis_answers WHERE id = ?');
      STAGING_DATA_IDS.answers.forEach((id) => answerDelete.run(id));
      database.prepare('DELETE FROM diagnosis_submissions WHERE id = ?')
        .run(STAGING_DATA_IDS.submission);
      database.prepare('DELETE FROM usage_counters WHERE company_id = ?')
        .run(STAGING_DATA_IDS.company);
      database.prepare('DELETE FROM company_subscription_events WHERE company_id = ?')
        .run(STAGING_DATA_IDS.company);
      database.prepare(
        `DELETE FROM legal_acceptances
         WHERE user_id IN (?, ?, ?)`,
      ).run(STAGING_DATA_IDS.admin, STAGING_DATA_IDS.owner, STAGING_DATA_IDS.employee);
      database.prepare(
        `DELETE FROM password_reset_tokens
         WHERE user_id IN (?, ?, ?)`,
      ).run(STAGING_DATA_IDS.admin, STAGING_DATA_IDS.owner, STAGING_DATA_IDS.employee);
      database.prepare('DELETE FROM company_subscriptions WHERE company_id = ?')
        .run(STAGING_DATA_IDS.company);
      const userDelete = database.prepare('DELETE FROM users WHERE id = ?');
      userDelete.run(STAGING_DATA_IDS.employee);
      userDelete.run(STAGING_DATA_IDS.owner);
      userDelete.run(STAGING_DATA_IDS.admin);
      database.prepare('DELETE FROM companies WHERE id = ?')
        .run(STAGING_DATA_IDS.company);
    })();
  } finally {
    database.close();
  }
}
