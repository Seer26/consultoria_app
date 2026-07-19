import { EntitlementsRepository } from './entitlements.repository';
import { audit } from '../../shared/audit';
import type {
  CompanyPlanRecord,
  CurrentPlanSnapshot,
  EntitlementUsageItem,
  PlanFeature,
} from './entitlements.types';

const FEATURE_LABELS: Record<PlanFeature, string> = {
  USER_SEATS: 'Usuarios ativos',
  RESEARCH_SUBMISSIONS_MONTHLY: 'Pesquisas mensais',
  REPORT_PDFS_MONTHLY: 'PDFs mensais',
  ACTION_TASKS_ACTIVE: 'Tarefas ativas',
  AI_QUESTIONS_MONTHLY: 'Perguntas de IA mensais',
};

export class PlanLimitError extends Error {
  readonly feature: PlanFeature;
  readonly limit: number;
  readonly used: number;
  readonly requested: number;

  constructor(input: { feature: PlanFeature; limit: number; used: number; requested: number }) {
    super('PLAN_LIMIT_REACHED');
    this.feature = input.feature;
    this.limit = input.limit;
    this.used = input.used;
    this.requested = input.requested;
  }
}

export function isPlanLimitError(error: unknown): error is PlanLimitError {
  return error instanceof PlanLimitError;
}

export function getCurrentUsagePeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getCurrentPeriodRange(now = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export class EntitlementsService {
  constructor(private readonly repository: EntitlementsRepository) {}

  ensureDefaultSubscription(companyId: string): CompanyPlanRecord {
    const existing = this.repository.findCompanyPlan(companyId);
    if (existing) {
      return existing;
    }

    if (!this.repository.companyExists(companyId)) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    const period = getCurrentPeriodRange();
    this.repository.createDefaultSubscription(companyId, period.start, period.end);

    const created = this.repository.findCompanyPlan(companyId);
    if (!created) {
      throw new Error('PLAN_NOT_FOUND');
    }

    return created;
  }

  resolveUserCompanyId(userId: string): string {
    const companyId = this.repository.findUserCompanyId(userId);
    if (!companyId) {
      throw new Error('COMPANY_ID_REQUIRED');
    }

    return companyId;
  }

  assertCanUseFeature(companyId: string, feature: PlanFeature, requested = 1): void {
    const current = this.getFeatureUsage(companyId, feature);
    if (current.used + requested > current.limit) {
      audit('plan_limit_blocked', {
        companyId,
        feature,
        used: current.used,
        limit: current.limit,
        requested,
      });
      throw new PlanLimitError({
        feature,
        limit: current.limit,
        used: current.used,
        requested,
      });
    }
  }

  recordUsage(companyId: string, feature: PlanFeature, quantity = 1): void {
    if (quantity <= 0) {
      return;
    }

    this.repository.incrementUsageCounter(companyId, feature, getCurrentUsagePeriod(), quantity);
  }

  listPlans() {
    return this.repository.listPlans().map((plan) => ({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      limits: {
        users: plan.maxUsers,
        researchSubmissionsMonthly: plan.maxResearchSubmissionsMonthly,
        reportPdfsMonthly: plan.maxReportPdfsMonthly,
        activeActionTasks: plan.maxActiveActionTasks,
        aiQuestionsMonthly: plan.maxAiQuestionsMonthly,
      },
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));
  }

  changeCompanyPlan(input: {
    companyId: string;
    planSlug: string;
    actorUserId: string;
    reason?: string | null;
  }): CurrentPlanSnapshot {
    const { companyId } = input;
    const normalizedSlug = input.planSlug.trim().toLowerCase();
    if (!normalizedSlug) {
      throw new Error('INVALID_PLAN_SLUG');
    }

    const current = this.ensureDefaultSubscription(companyId);

    const plan = this.repository.findPlanBySlug(normalizedSlug);
    if (!plan || plan.status !== 'ACTIVE') {
      throw new Error('PLAN_NOT_FOUND');
    }

    const updatedAt = new Date().toISOString();
    this.repository.updateCompanyPlan(companyId, plan.id, updatedAt);
    this.repository.createSubscriptionEvent({
      companyId,
      previousPlanId: current.plan.id,
      newPlanId: plan.id,
      actorUserId: input.actorUserId,
      origin: 'MANUAL_ADMIN',
      reason: input.reason?.trim() || null,
      createdAt: updatedAt,
    });

    audit('company_plan_changed', {
      companyId,
      previousPlanId: current.plan.id,
      newPlanId: plan.id,
      actorUserId: input.actorUserId,
      origin: 'MANUAL_ADMIN',
    });

    return this.getCurrentPlan(companyId);
  }

  listCompanyPlanEvents(companyId: string) {
    this.ensureDefaultSubscription(companyId);
    return this.repository.listSubscriptionEvents(companyId);
  }

  getCurrentPlan(companyId: string): CurrentPlanSnapshot {
    const companyPlan = this.ensureDefaultSubscription(companyId);

    return {
      companyId,
      plan: {
        id: companyPlan.plan.id,
        slug: companyPlan.plan.slug,
        name: companyPlan.plan.name,
        description: companyPlan.plan.description,
        status: companyPlan.plan.status,
        limits: {
          users: companyPlan.plan.maxUsers,
          researchSubmissionsMonthly: companyPlan.plan.maxResearchSubmissionsMonthly,
          reportPdfsMonthly: companyPlan.plan.maxReportPdfsMonthly,
          activeActionTasks: companyPlan.plan.maxActiveActionTasks,
          aiQuestionsMonthly: companyPlan.plan.maxAiQuestionsMonthly,
        },
      },
      subscription: {
        id: companyPlan.subscription.id,
        status: companyPlan.subscription.status,
        currentPeriodStart: companyPlan.subscription.currentPeriodStart,
        currentPeriodEnd: companyPlan.subscription.currentPeriodEnd,
        updatedAt: companyPlan.subscription.updatedAt,
      },
      usage: {
        users: this.getFeatureUsage(companyId, 'USER_SEATS'),
        researchSubmissionsMonthly: this.getFeatureUsage(companyId, 'RESEARCH_SUBMISSIONS_MONTHLY'),
        reportPdfsMonthly: this.getFeatureUsage(companyId, 'REPORT_PDFS_MONTHLY'),
        activeActionTasks: this.getFeatureUsage(companyId, 'ACTION_TASKS_ACTIVE'),
        aiQuestionsMonthly: this.getFeatureUsage(companyId, 'AI_QUESTIONS_MONTHLY'),
      },
    };
  }

  private getFeatureUsage(companyId: string, feature: PlanFeature): EntitlementUsageItem {
    const companyPlan = this.ensureDefaultSubscription(companyId);
    const period = getCurrentUsagePeriod();
    const periodRange = getCurrentPeriodRange();

    const limit = this.getFeatureLimit(companyPlan, feature);
    const used = (() => {
      switch (feature) {
        case 'USER_SEATS':
          return this.repository.countActiveUsers(companyId);
        case 'RESEARCH_SUBMISSIONS_MONTHLY':
          return this.repository.countResearchSubmissions(
            companyId,
            periodRange.start,
            periodRange.end,
          );
        case 'ACTION_TASKS_ACTIVE':
          return this.repository.countActiveActionTasks(companyId);
        case 'REPORT_PDFS_MONTHLY':
        case 'AI_QUESTIONS_MONTHLY':
          return this.repository.getUsageCounter(companyId, feature, period);
        default:
          return 0;
      }
    })();

    return {
      feature,
      label: FEATURE_LABELS[feature],
      used,
      limit,
      remaining: Math.max(limit - used, 0),
      period:
        feature === 'USER_SEATS' || feature === 'ACTION_TASKS_ACTIVE'
          ? null
          : period,
    };
  }

  private getFeatureLimit(companyPlan: CompanyPlanRecord, feature: PlanFeature): number {
    const { plan } = companyPlan;

    switch (feature) {
      case 'USER_SEATS':
        return plan.maxUsers;
      case 'RESEARCH_SUBMISSIONS_MONTHLY':
        return plan.maxResearchSubmissionsMonthly;
      case 'REPORT_PDFS_MONTHLY':
        return plan.maxReportPdfsMonthly;
      case 'ACTION_TASKS_ACTIVE':
        return plan.maxActiveActionTasks;
      case 'AI_QUESTIONS_MONTHLY':
        return plan.maxAiQuestionsMonthly;
      default:
        return 0;
    }
  }
}
