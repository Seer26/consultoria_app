export type PlanFeature =
  | 'USER_SEATS'
  | 'RESEARCH_SUBMISSIONS_MONTHLY'
  | 'REPORT_PDFS_MONTHLY'
  | 'ACTION_TASKS_ACTIVE'
  | 'AI_QUESTIONS_MONTHLY';

export interface PlanRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  maxUsers: number;
  maxResearchSubmissionsMonthly: number;
  maxReportPdfsMonthly: number;
  maxActiveActionTasks: number;
  maxAiQuestionsMonthly: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySubscriptionRecord {
  id: string;
  companyId: string;
  planId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyPlanRecord {
  plan: PlanRecord;
  subscription: CompanySubscriptionRecord;
}

export interface EntitlementUsageItem {
  feature: PlanFeature;
  label: string;
  used: number;
  limit: number;
  remaining: number;
  period: string | null;
}

export interface CurrentPlanSnapshot {
  companyId: string;
  plan: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: PlanRecord['status'];
    limits: {
      users: number;
      researchSubmissionsMonthly: number;
      reportPdfsMonthly: number;
      activeActionTasks: number;
      aiQuestionsMonthly: number;
    };
  };
  subscription: {
    id: string;
    status: CompanySubscriptionRecord['status'];
    currentPeriodStart: string;
    currentPeriodEnd: string;
    updatedAt: string;
  };
  usage: {
    users: EntitlementUsageItem;
    researchSubmissionsMonthly: EntitlementUsageItem;
    reportPdfsMonthly: EntitlementUsageItem;
    activeActionTasks: EntitlementUsageItem;
    aiQuestionsMonthly: EntitlementUsageItem;
  };
}

export interface CompanySubscriptionEventRecord {
  id: string;
  companyId: string;
  previousPlanId: string | null;
  previousPlanSlug: string | null;
  previousPlanName: string | null;
  newPlanId: string;
  newPlanSlug: string;
  newPlanName: string;
  actorUserId: string | null;
  actorUserName: string | null;
  actorUserEmail: string | null;
  origin: 'MANUAL_ADMIN';
  reason: string | null;
  createdAt: string;
}
