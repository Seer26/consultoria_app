import type { AuthTokenPayload } from '../auth/auth.types';
import { DashboardRepository } from './dashboard.repository';

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getAdminDashboard(auth: AuthTokenPayload) {
    await this.ensureActiveAdmin(auth.userId, auth.role);

    return {
      metrics: await this.repository.getAdminMetrics(),
      lowestScoreCompanies: await this.repository.listLowestScoreCompanies(5),
      recentResearch: await this.repository.listRecentResearch({ limit: 5 }),
      recentTasks: await this.repository.listRecentTasks({ limit: 5 }),
      pillarScores: [],
      criticalPoints: [],
      opportunities: [],
    };
  }

  async getCompanyDashboard(auth: AuthTokenPayload) {
    const actor = await this.ensureActiveUser(auth.userId);
    if (actor.role !== 'OWNER') {
      throw new Error('FORBIDDEN');
    }

    const companyId = this.ensureActorCompany(actor.company_id);
    const company = await this.repository.findCompanyById(companyId);
    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    const latestCompletedResearch =
      await this.repository.getLatestCompletedResearchByCompany(companyId);
    const recentInsights = await this.repository.listRecentInsights(companyId, 6);
    const attentionTasks = await this.repository.listUpcomingTasks({
      companyId,
      limit: 30,
    });

    return {
      company: {
        id: company.id,
        name: company.name,
      },
      metrics: await this.repository.getCompanyMetrics(companyId),
      pillarScores: latestCompletedResearch.pillarScores,
      criticalPoints: recentInsights.criticalPoints,
      opportunities: recentInsights.opportunities,
      recentResearch: await this.repository.listRecentResearch({
        companyId,
        limit: 5,
      }),
      recentTasks: await this.repository.listRecentTasks({
        companyId,
        limit: 5,
      }),
      upcomingTasks: attentionTasks.filter((task) => !task.isOverdue).slice(0, 5),
      overdueTasks: attentionTasks.filter((task) => task.isOverdue).slice(0, 5),
      dueSoonTasks: attentionTasks.filter((task) => task.isDueSoon).slice(0, 5),
      latestCompletedResearch: latestCompletedResearch.submission,
    };
  }

  async getEmployeeDashboard(auth: AuthTokenPayload) {
    const actor = await this.ensureActiveUser(auth.userId);
    if (actor.role !== 'EMPLOYEE') {
      throw new Error('FORBIDDEN');
    }

    const companyId = this.ensureActorCompany(actor.company_id);
    const latestResearch = await this.repository.getLatestResearchByUser(actor.id);
    const attentionTasks = await this.repository.listUpcomingTasks({
      responsibleUserId: actor.id,
      limit: 30,
    });

    return {
      metrics: await this.repository.getEmployeeMetrics(companyId, actor.id),
      lastResearch: latestResearch.submission,
      pillarScores: latestResearch.pillarScores,
      recentResearch: await this.repository.listRecentResearch({
        userId: actor.id,
        limit: 5,
      }),
      recentTasks: await this.repository.listRecentTasks({
        responsibleUserId: actor.id,
        limit: 5,
      }),
      upcomingTasks: attentionTasks.filter((task) => !task.isOverdue).slice(0, 5),
      overdueTasks: attentionTasks.filter((task) => task.isOverdue).slice(0, 5),
      dueSoonTasks: attentionTasks.filter((task) => task.isDueSoon).slice(0, 5),
      companySummary: await this.repository.getCompanySummary(companyId),
    };
  }

  private async ensureActiveAdmin(userId: string, role: string): Promise<void> {
    const actor = await this.ensureActiveUser(userId);
    if (role !== 'ADMIN' || actor.role !== 'ADMIN') {
      throw new Error('FORBIDDEN');
    }
  }

  private async ensureActiveUser(userId: string) {
    const actor = await this.repository.findUserById(userId);
    if (!actor) {
      throw new Error('USER_NOT_FOUND');
    }

    if (actor.status !== 'ACTIVE') {
      throw new Error('INACTIVE_USER');
    }

    return actor;
  }

  private ensureActorCompany(companyId: string | null): string {
    if (!companyId) {
      throw new Error('COMPANY_ID_REQUIRED');
    }

    return companyId;
  }
}
