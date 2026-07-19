import { randomUUID } from 'node:crypto';

import { database } from '../../db/database';
import type {
  CompanyPlanRecord,
  CompanySubscriptionEventRecord,
  CompanySubscriptionRecord,
  PlanFeature,
  PlanRecord,
} from './entitlements.types';

interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: PlanRecord['status'];
  max_users: number;
  max_research_submissions_monthly: number;
  max_report_pdfs_monthly: number;
  max_active_action_tasks: number;
  max_ai_questions_monthly: number;
  created_at: string;
  updated_at: string;
}

interface CompanyPlanRow extends PlanRow {
  subscription_id: string;
  subscription_company_id: string;
  subscription_plan_id: string;
  subscription_status: CompanySubscriptionRecord['status'];
  current_period_start: string;
  current_period_end: string;
  subscription_created_at: string;
  subscription_updated_at: string;
}

interface SubscriptionEventRow {
  id: string;
  company_id: string;
  previous_plan_id: string | null;
  previous_plan_slug: string | null;
  previous_plan_name: string | null;
  new_plan_id: string;
  new_plan_slug: string;
  new_plan_name: string;
  actor_user_id: string | null;
  actor_user_name: string | null;
  actor_user_email: string | null;
  origin: CompanySubscriptionEventRecord['origin'];
  reason: string | null;
  created_at: string;
}

function mapPlan(row: PlanRow): PlanRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    maxUsers: Number(row.max_users),
    maxResearchSubmissionsMonthly: Number(row.max_research_submissions_monthly),
    maxReportPdfsMonthly: Number(row.max_report_pdfs_monthly),
    maxActiveActionTasks: Number(row.max_active_action_tasks),
    maxAiQuestionsMonthly: Number(row.max_ai_questions_monthly),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class EntitlementsRepository {
  listPlans(): PlanRecord[] {
    const rows = database.prepare(`
      SELECT *
      FROM plans
      WHERE status = 'ACTIVE'
      ORDER BY max_users ASC, name ASC
    `).all() as PlanRow[];

    return rows.map(mapPlan);
  }

  findPlanBySlug(slug: string): PlanRecord | null {
    const row = database.prepare(`
      SELECT *
      FROM plans
      WHERE slug = ?
      LIMIT 1
    `).get(slug) as PlanRow | undefined;

    return row ? mapPlan(row) : null;
  }

  findCompanyPlan(companyId: string): CompanyPlanRecord | null {
    const row = database.prepare(`
      SELECT
        p.*,
        cs.id AS subscription_id,
        cs.company_id AS subscription_company_id,
        cs.plan_id AS subscription_plan_id,
        cs.status AS subscription_status,
        cs.current_period_start,
        cs.current_period_end,
        cs.created_at AS subscription_created_at,
        cs.updated_at AS subscription_updated_at
      FROM company_subscriptions cs
      INNER JOIN plans p ON p.id = cs.plan_id
      WHERE cs.company_id = ?
      LIMIT 1
    `).get(companyId) as CompanyPlanRow | undefined;

    if (!row) {
      return null;
    }

    return {
      plan: mapPlan(row),
      subscription: {
        id: row.subscription_id,
        companyId: row.subscription_company_id,
        planId: row.subscription_plan_id,
        status: row.subscription_status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        createdAt: row.subscription_created_at,
        updatedAt: row.subscription_updated_at,
      },
    };
  }

  createDefaultSubscription(companyId: string, periodStart: string, periodEnd: string): void {
    const now = new Date().toISOString();

    database.prepare(`
      INSERT OR IGNORE INTO company_subscriptions (
        id, company_id, plan_id, status,
        current_period_start, current_period_end,
        created_at, updated_at
      )
      VALUES (
        @id, @companyId, 'plan-starter', 'ACTIVE',
        @periodStart, @periodEnd,
        @createdAt, @updatedAt
      )
    `).run({
      id: `subscription-${companyId}`,
      companyId,
      periodStart,
      periodEnd,
      createdAt: now,
      updatedAt: now,
    });
  }

  companyExists(companyId: string): boolean {
    const row = database.prepare(`
      SELECT id
      FROM companies
      WHERE id = ?
      LIMIT 1
    `).get(companyId) as { id: string } | undefined;

    return Boolean(row);
  }

  findUserCompanyId(userId: string): string | null {
    const row = database.prepare(`
      SELECT company_id
      FROM users
      WHERE id = ?
      LIMIT 1
    `).get(userId) as { company_id: string | null } | undefined;

    return row?.company_id ?? null;
  }

  countActiveUsers(companyId: string): number {
    const row = database.prepare(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE company_id = ?
        AND status = 'ACTIVE'
    `).get(companyId) as { total: number } | undefined;

    return Number(row?.total ?? 0);
  }

  countResearchSubmissions(companyId: string, periodStart: string, periodEnd: string): number {
    const row = database.prepare(`
      SELECT COUNT(*) AS total
      FROM diagnosis_submissions
      WHERE company_id = ?
        AND submission_type = 'RESEARCH'
        AND created_at >= ?
        AND created_at < ?
    `).get(companyId, periodStart, periodEnd) as { total: number } | undefined;

    return Number(row?.total ?? 0);
  }

  countActiveActionTasks(companyId: string): number {
    const row = database.prepare(`
      SELECT COUNT(*) AS total
      FROM action_plan_tasks
      WHERE company_id = ?
        AND status NOT IN ('DONE', 'CANCELED')
    `).get(companyId) as { total: number } | undefined;

    return Number(row?.total ?? 0);
  }

  getUsageCounter(companyId: string, feature: PlanFeature, period: string): number {
    const row = database.prepare(`
      SELECT quantity
      FROM usage_counters
      WHERE company_id = ?
        AND feature = ?
        AND period = ?
      LIMIT 1
    `).get(companyId, feature, period) as { quantity: number } | undefined;

    return Number(row?.quantity ?? 0);
  }

  incrementUsageCounter(
    companyId: string,
    feature: PlanFeature,
    period: string,
    quantity: number,
  ): void {
    database.prepare(`
      INSERT INTO usage_counters (id, company_id, feature, period, quantity, updated_at)
      VALUES (@id, @companyId, @feature, @period, @quantity, @updatedAt)
      ON CONFLICT(company_id, feature, period) DO UPDATE SET
        quantity = usage_counters.quantity + excluded.quantity,
        updated_at = excluded.updated_at
    `).run({
      id: randomUUID(),
      companyId,
      feature,
      period,
      quantity,
      updatedAt: new Date().toISOString(),
    });
  }

  updateCompanyPlan(companyId: string, planId: string, updatedAt: string): void {
    database.prepare(`
      UPDATE company_subscriptions
      SET plan_id = ?,
          status = 'ACTIVE',
          updated_at = ?
      WHERE company_id = ?
    `).run(planId, updatedAt, companyId);
  }

  createSubscriptionEvent(input: {
    companyId: string;
    previousPlanId: string | null;
    newPlanId: string;
    actorUserId: string | null;
    origin: CompanySubscriptionEventRecord['origin'];
    reason: string | null;
    createdAt: string;
  }): void {
    database.prepare(`
      INSERT INTO company_subscription_events (
        id, company_id, previous_plan_id, new_plan_id, actor_user_id,
        origin, reason, created_at
      )
      VALUES (
        @id, @companyId, @previousPlanId, @newPlanId, @actorUserId,
        @origin, @reason, @createdAt
      )
    `).run({
      id: randomUUID(),
      ...input,
    });
  }

  listSubscriptionEvents(companyId: string): CompanySubscriptionEventRecord[] {
    const rows = database.prepare(`
      SELECT
        e.id,
        e.company_id,
        e.previous_plan_id,
        pp.slug AS previous_plan_slug,
        pp.name AS previous_plan_name,
        e.new_plan_id,
        np.slug AS new_plan_slug,
        np.name AS new_plan_name,
        e.actor_user_id,
        u.name AS actor_user_name,
        u.email AS actor_user_email,
        e.origin,
        e.reason,
        e.created_at
      FROM company_subscription_events e
      LEFT JOIN plans pp ON pp.id = e.previous_plan_id
      INNER JOIN plans np ON np.id = e.new_plan_id
      LEFT JOIN users u ON u.id = e.actor_user_id
      WHERE e.company_id = ?
      ORDER BY e.created_at DESC
    `).all(companyId) as SubscriptionEventRow[];

    return rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      previousPlanId: row.previous_plan_id,
      previousPlanSlug: row.previous_plan_slug,
      previousPlanName: row.previous_plan_name,
      newPlanId: row.new_plan_id,
      newPlanSlug: row.new_plan_slug,
      newPlanName: row.new_plan_name,
      actorUserId: row.actor_user_id,
      actorUserName: row.actor_user_name,
      actorUserEmail: row.actor_user_email,
      origin: row.origin,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  }
}
