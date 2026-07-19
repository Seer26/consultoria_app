import { randomUUID } from 'node:crypto';

import { dataSource } from '../../database/data-source';
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
  async listPlans(): Promise<PlanRecord[]> {
    const rows = await dataSource.many<PlanRow>(`
      SELECT *
      FROM plans
      WHERE status = 'ACTIVE'
      ORDER BY max_users ASC, name ASC
    `);

    return rows.map(mapPlan);
  }

  async findPlanBySlug(slug: string): Promise<PlanRecord | null> {
    const row = await dataSource.one<PlanRow>(`
      SELECT *
      FROM plans
      WHERE slug = ?
      LIMIT 1
    `, [slug]);

    return row ? mapPlan(row) : null;
  }

  async findCompanyPlan(companyId: string): Promise<CompanyPlanRecord | null> {
    const row = await dataSource.one<CompanyPlanRow>(`
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
    `, [companyId]);

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

  async createDefaultSubscription(
    companyId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    await dataSource.execute(`
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
    `, {
      id: `subscription-${companyId}`,
      companyId,
      periodStart,
      periodEnd,
      createdAt: now,
      updatedAt: now,
    });
  }

  async companyExists(companyId: string): Promise<boolean> {
    const row = await dataSource.one<{ id: string }>(`
      SELECT id
      FROM companies
      WHERE id = ?
      LIMIT 1
    `, [companyId]);

    return Boolean(row);
  }

  async findUserCompanyId(userId: string): Promise<string | null> {
    const row = await dataSource.one<{ company_id: string | null }>(`
      SELECT company_id
      FROM users
      WHERE id = ?
      LIMIT 1
    `, [userId]);

    return row?.company_id ?? null;
  }

  async countActiveUsers(companyId: string): Promise<number> {
    const row = await dataSource.one<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE company_id = ?
        AND status = 'ACTIVE'
    `, [companyId]);

    return Number(row?.total ?? 0);
  }

  async countResearchSubmissions(
    companyId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<number> {
    const row = await dataSource.one<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM diagnosis_submissions
      WHERE company_id = ?
        AND submission_type = 'RESEARCH'
        AND created_at >= ?
        AND created_at < ?
    `, [companyId, periodStart, periodEnd]);

    return Number(row?.total ?? 0);
  }

  async countActiveActionTasks(companyId: string): Promise<number> {
    const row = await dataSource.one<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM action_plan_tasks
      WHERE company_id = ?
        AND status NOT IN ('DONE', 'CANCELED')
    `, [companyId]);

    return Number(row?.total ?? 0);
  }

  async getUsageCounter(
    companyId: string,
    feature: PlanFeature,
    period: string,
  ): Promise<number> {
    const row = await dataSource.one<{ quantity: number }>(`
      SELECT quantity
      FROM usage_counters
      WHERE company_id = ?
        AND feature = ?
        AND period = ?
      LIMIT 1
    `, [companyId, feature, period]);

    return Number(row?.quantity ?? 0);
  }

  async incrementUsageCounter(
    companyId: string,
    feature: PlanFeature,
    period: string,
    quantity: number,
  ): Promise<void> {
    await dataSource.execute(`
      INSERT INTO usage_counters (id, company_id, feature, period, quantity, updated_at)
      VALUES (@id, @companyId, @feature, @period, @quantity, @updatedAt)
      ON CONFLICT(company_id, feature, period) DO UPDATE SET
        quantity = usage_counters.quantity + excluded.quantity,
        updated_at = excluded.updated_at
    `, {
      id: randomUUID(),
      companyId,
      feature,
      period,
      quantity,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateCompanyPlan(
    companyId: string,
    planId: string,
    updatedAt: string,
  ): Promise<void> {
    await dataSource.execute(`
      UPDATE company_subscriptions
      SET plan_id = ?,
          status = 'ACTIVE',
          updated_at = ?
      WHERE company_id = ?
    `, [planId, updatedAt, companyId]);
  }

  async createSubscriptionEvent(input: {
    companyId: string;
    previousPlanId: string | null;
    newPlanId: string;
    actorUserId: string | null;
    origin: CompanySubscriptionEventRecord['origin'];
    reason: string | null;
    createdAt: string;
  }): Promise<void> {
    await dataSource.execute(`
      INSERT INTO company_subscription_events (
        id, company_id, previous_plan_id, new_plan_id, actor_user_id,
        origin, reason, created_at
      )
      VALUES (
        @id, @companyId, @previousPlanId, @newPlanId, @actorUserId,
        @origin, @reason, @createdAt
      )
    `, {
      id: randomUUID(),
      ...input,
    });
  }

  async listSubscriptionEvents(
    companyId: string,
  ): Promise<CompanySubscriptionEventRecord[]> {
    const rows = await dataSource.many<SubscriptionEventRow>(`
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
    `, [companyId]);

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

  async changeCompanyPlanWithEvent(input: {
    companyId: string;
    planId: string;
    previousPlanId: string | null;
    actorUserId: string | null;
    origin: CompanySubscriptionEventRecord['origin'];
    reason: string | null;
    createdAt: string;
  }): Promise<void> {
    await dataSource.transaction(async () => {
      await this.updateCompanyPlan(input.companyId, input.planId, input.createdAt);
      await this.createSubscriptionEvent({
        companyId: input.companyId,
        previousPlanId: input.previousPlanId,
        newPlanId: input.planId,
        actorUserId: input.actorUserId,
        origin: input.origin,
        reason: input.reason,
        createdAt: input.createdAt,
      });
    });
  }
}
