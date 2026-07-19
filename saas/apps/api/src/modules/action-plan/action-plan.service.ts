import { randomUUID } from 'node:crypto';

import type { AuthTokenPayload } from '../auth/auth.types';
import { EntitlementsRepository } from '../entitlements/entitlements.repository';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { ActionPlanRepository } from './action-plan.repository';
import type {
  ActionPlanAccessContext,
  ActionPlanAssignee,
  ActionPlanGenerationResult,
  ActionPlanListFilters,
  ActionPlanTaskDetails,
  ActionPlanTaskPriority,
  ActionPlanTaskRecord,
  ActionPlanTaskSource,
  ActionPlanTaskStatus,
  CreateActionPlanTaskInput,
  UpdateActionPlanTaskInput,
  UpdateActionPlanTaskStatusInput,
} from './action-plan.types';

const VALID_PRIORITIES: ActionPlanTaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_STATUSES: ActionPlanTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELED'];
const VALID_SOURCES: ActionPlanTaskSource[] = ['RESEARCH_RECOMMENDATION', 'MANUAL', 'AI'];

export class ActionPlanService {
  constructor(
    private readonly repository: ActionPlanRepository,
    private readonly entitlementsService = new EntitlementsService(
      new EntitlementsRepository(),
    ),
  ) {}

  listTasks(auth: AuthTokenPayload, filters: ActionPlanListFilters): ActionPlanTaskDetails[] {
    const context = this.getAccessContext(auth);
    this.ensureActiveUser(context);

    if (context.actor.role === 'ADMIN') {
      return this.applyListFilters(auth, filters, this.repository.listTasks({
        companyId: filters.companyId?.trim() || undefined,
        submissionId: filters.submissionId?.trim() || undefined,
      }));
    }

    const companyId = this.ensureActorCompany(context);
    if (filters.companyId?.trim() && filters.companyId.trim() !== companyId) {
      throw new Error('FORBIDDEN');
    }

    return this.applyListFilters(auth, filters, this.repository.listTasks({
      companyId,
      submissionId: filters.submissionId?.trim() || undefined,
    }));
  }

  listAssignees(auth: AuthTokenPayload, requestedCompanyId?: string): ActionPlanAssignee[] {
    const context = this.getAccessContext(auth);
    this.ensureActiveUser(context);
    const companyId = this.resolveCompanyId(context, requestedCompanyId);
    return this.repository.listActiveAssignees(companyId);
  }

  getTaskById(auth: AuthTokenPayload, taskId: string): ActionPlanTaskDetails {
    const context = this.getAccessContext(auth);
    this.ensureActiveUser(context);
    const task = this.repository.findTaskById(taskId);

    if (!task) {
      throw new Error('ACTION_PLAN_TASK_NOT_FOUND');
    }

    this.ensureTaskAccess(context, task.companyId);
    return this.decorateTask(task);
  }

  createTask(auth: AuthTokenPayload, input: CreateActionPlanTaskInput): ActionPlanTaskDetails {
    const context = this.getAccessContext(auth);
    this.ensureActiveUser(context);

    const companyId = this.resolveCompanyId(context, input.companyId);
    const title = input.title?.trim();
    if (!title) {
      throw new Error('ACTION_PLAN_TITLE_REQUIRED');
    }

    const priority = this.validatePriority(input.priority ?? 'MEDIUM');
    const status = this.validateStatus(input.status ?? 'TODO');
    const dueDate = this.validateDate(input.dueDate);
    const responsibleUserId = this.validateResponsibleUser(companyId, input.responsibleUserId);
    const source = this.validateSource(input.source ?? 'MANUAL');
    const submissionId = this.validateSubmission(companyId, input.submissionId ?? null);
    const now = new Date().toISOString();

    if (this.isActiveTaskStatus(status)) {
      this.entitlementsService.assertCanUseFeature(companyId, 'ACTION_TASKS_ACTIVE');
    }

    const created = this.repository.createTask({
      id: randomUUID(),
      companyId,
      submissionId,
      title,
      description: input.description?.trim() || '',
      pillar: input.pillar?.trim() || null,
      priority,
      status,
      dueDate,
      responsibleUserId,
      source,
      createdAt: now,
      updatedAt: now,
      completedAt: status === 'DONE' ? now : null,
    });

    return this.decorateTask(this.repository.findTaskById(created.id)!);
  }

  updateTask(
    auth: AuthTokenPayload,
    taskId: string,
    input: UpdateActionPlanTaskInput,
  ): ActionPlanTaskDetails {
    const context = this.getAccessContext(auth);
    this.ensureActiveUser(context);
    const existing = this.getTaskRecordOrThrow(taskId);
    this.ensureTaskAccess(context, existing.companyId);

    const nextTitle = input.title === undefined ? existing.title : input.title.trim();
    if (!nextTitle) {
      throw new Error('ACTION_PLAN_TITLE_REQUIRED');
    }

    const nextStatus = this.validateStatus(input.status ?? existing.status);
    const updatedAt = new Date().toISOString();

    if (!this.isActiveTaskStatus(existing.status) && this.isActiveTaskStatus(nextStatus)) {
      this.entitlementsService.assertCanUseFeature(
        existing.companyId,
        'ACTION_TASKS_ACTIVE',
      );
    }

    this.repository.updateTask({
      ...existing,
      title: nextTitle,
      description: input.description === undefined ? existing.description : input.description.trim(),
      pillar: input.pillar === undefined ? existing.pillar : input.pillar?.trim() || null,
      priority: this.validatePriority(input.priority ?? existing.priority),
      status: nextStatus,
      dueDate: input.dueDate === undefined ? existing.dueDate : this.validateDate(input.dueDate),
      responsibleUserId:
        input.responsibleUserId === undefined
          ? existing.responsibleUserId
          : this.validateResponsibleUser(existing.companyId, input.responsibleUserId),
      updatedAt,
      completedAt: this.resolveCompletedAt(existing.completedAt, nextStatus, updatedAt),
    });

    return this.decorateTask(this.repository.findTaskById(taskId)!);
  }

  updateTaskStatus(
    auth: AuthTokenPayload,
    taskId: string,
    input: UpdateActionPlanTaskStatusInput,
  ): ActionPlanTaskDetails {
    const context = this.getAccessContext(auth);
    this.ensureActiveUser(context);
    const existing = this.getTaskRecordOrThrow(taskId);
    this.ensureTaskAccess(context, existing.companyId);

    const status = this.validateStatus(input.status);
    const updatedAt = new Date().toISOString();

    if (!this.isActiveTaskStatus(existing.status) && this.isActiveTaskStatus(status)) {
      this.entitlementsService.assertCanUseFeature(
        existing.companyId,
        'ACTION_TASKS_ACTIVE',
      );
    }

    this.repository.updateTask({
      ...existing,
      status,
      updatedAt,
      completedAt: this.resolveCompletedAt(existing.completedAt, status, updatedAt),
    });

    return this.decorateTask(this.repository.findTaskById(taskId)!);
  }

  generateFromResearch(
    auth: AuthTokenPayload,
    input: {
      submissionId: string;
      companyId: string;
      status: string;
      criticalPoints: string[];
      opportunities: string[];
      recommendations: string[];
      nextSteps: string[];
      pillarScores: Array<{ pillar: string; score: number }>;
    },
  ): ActionPlanGenerationResult {
    const context = this.getAccessContext(auth);
    this.ensureActiveUser(context);
    this.ensureTaskAccess(context, input.companyId);

    if (input.status !== 'COMPLETED') {
      throw new Error('ACTION_PLAN_SUBMISSION_NOT_COMPLETED');
    }

    const existing = this.repository.listTasks({ submissionId: input.submissionId });
    if (existing.length > 0) {
      return {
        submissionId: input.submissionId,
        companyId: input.companyId,
        alreadyGenerated: true,
        createdCount: 0,
        tasks: existing.map((task) => this.decorateTask(task)),
      };
    }

    const generated = this.buildTasksFromResearch(input);
    if (generated.length > 0) {
      this.entitlementsService.assertCanUseFeature(
        input.companyId,
        'ACTION_TASKS_ACTIVE',
        generated.length,
      );
    }

    this.repository.createTasks(generated);

    return {
      submissionId: input.submissionId,
      companyId: input.companyId,
      alreadyGenerated: false,
      createdCount: generated.length,
      tasks: this.repository
        .listTasks({ submissionId: input.submissionId })
        .map((task) => this.decorateTask(task)),
    };
  }

  private buildTasksFromResearch(input: {
    submissionId: string;
    companyId: string;
    criticalPoints: string[];
    opportunities: string[];
    recommendations: string[];
    nextSteps: string[];
    pillarScores: Array<{ pillar: string; score: number }>;
  }): ActionPlanTaskRecord[] {
    const usedTitles = new Set<string>();
    const tasks: ActionPlanTaskRecord[] = [];
    const now = new Date();
    const pillarPriorityMap = new Map<string, ActionPlanTaskPriority>();

    for (const item of input.pillarScores) {
      if (item.score < 40) {
        pillarPriorityMap.set(item.pillar, 'CRITICAL');
      } else if (item.score < 60) {
        pillarPriorityMap.set(item.pillar, 'HIGH');
      } else if (item.score < 75) {
        pillarPriorityMap.set(item.pillar, 'MEDIUM');
      } else {
        pillarPriorityMap.set(item.pillar, 'LOW');
      }
    }

    const pushTask = (task: {
      title: string;
      description: string;
      pillar: string | null;
      priority: ActionPlanTaskPriority;
      source: ActionPlanTaskSource;
      dueInDays: number;
    }) => {
      const normalizedTitle = task.title.trim().toLowerCase();
      if (!normalizedTitle || usedTitles.has(normalizedTitle)) {
        return;
      }

      usedTitles.add(normalizedTitle);
      const createdAt = now.toISOString();
      const dueDate = new Date(now.getTime());
      dueDate.setDate(dueDate.getDate() + task.dueInDays);

      tasks.push({
        id: randomUUID(),
        companyId: input.companyId,
        submissionId: input.submissionId,
        title: task.title.trim(),
        description: task.description.trim(),
        pillar: task.pillar,
        priority: task.priority,
        status: 'TODO',
        dueDate: dueDate.toISOString(),
        responsibleUserId: null,
        source: task.source,
        createdAt,
        updatedAt: createdAt,
        completedAt: null,
      });
    };

    input.criticalPoints.forEach((criticalPoint, index) => {
      const pillar = this.extractPillar(criticalPoint, input.pillarScores);
      const recommendation = input.recommendations[index] ?? input.recommendations[0] ?? '';
      const priority = pillar ? pillarPriorityMap.get(pillar) ?? 'HIGH' : 'HIGH';
      pushTask({
        title: pillar ? `Atacar gargalo em ${pillar}` : `Atacar ponto critico ${index + 1}`,
        description: [criticalPoint, recommendation].filter(Boolean).join(' '),
        pillar,
        priority: priority === 'LOW' || priority === 'MEDIUM' ? 'HIGH' : priority,
        source: 'RESEARCH_RECOMMENDATION',
        dueInDays: priority === 'CRITICAL' ? 7 : 10,
      });
    });

    input.recommendations.forEach((recommendation, index) => {
      const pillar = this.extractPillar(recommendation, input.pillarScores);
      const priority = pillar ? pillarPriorityMap.get(pillar) ?? 'MEDIUM' : 'MEDIUM';
      pushTask({
        title: pillar ? `Executar recomendacao em ${pillar}` : `Executar recomendacao ${index + 1}`,
        description: recommendation,
        pillar,
        priority,
        source: 'RESEARCH_RECOMMENDATION',
        dueInDays: priority === 'HIGH' || priority === 'CRITICAL' ? 14 : 21,
      });
    });

    input.nextSteps.forEach((step, index) => {
      const pillar = this.extractPillar(step, input.pillarScores);
      const priority = pillar ? pillarPriorityMap.get(pillar) ?? 'MEDIUM' : 'MEDIUM';
      pushTask({
        title: pillar ? `Proximo passo em ${pillar}` : `Proximo passo ${index + 1}`,
        description: step,
        pillar,
        priority,
        source: 'AI',
        dueInDays: 7 + index * 3,
      });
    });

    input.opportunities.forEach((opportunity, index) => {
      const pillar = this.extractPillar(opportunity, input.pillarScores);
      pushTask({
        title: pillar ? `Aproveitar oportunidade em ${pillar}` : `Aproveitar oportunidade ${index + 1}`,
        description: opportunity,
        pillar,
        priority: 'MEDIUM',
        source: 'AI',
        dueInDays: 21 + index * 3,
      });
    });

    return tasks.slice(0, 12);
  }

  private extractPillar(
    text: string,
    pillarScores: Array<{ pillar: string; score: number }>,
  ): string | null {
    const normalized = text.toLowerCase();
    const match = pillarScores.find((item) => normalized.includes(item.pillar.toLowerCase()));
    return match?.pillar ?? null;
  }

  private getTaskRecordOrThrow(taskId: string): ActionPlanTaskRecord {
    const task = this.repository.findTaskById(taskId);
    if (!task) {
      throw new Error('ACTION_PLAN_TASK_NOT_FOUND');
    }

    return task;
  }

  private validatePriority(value: string): ActionPlanTaskPriority {
    if (VALID_PRIORITIES.includes(value as ActionPlanTaskPriority)) {
      return value as ActionPlanTaskPriority;
    }

    throw new Error('INVALID_ACTION_PLAN_PRIORITY');
  }

  private validateStatus(value: string): ActionPlanTaskStatus {
    if (VALID_STATUSES.includes(value as ActionPlanTaskStatus)) {
      return value as ActionPlanTaskStatus;
    }

    throw new Error('INVALID_ACTION_PLAN_STATUS');
  }

  private isActiveTaskStatus(status: ActionPlanTaskStatus): boolean {
    return status !== 'DONE' && status !== 'CANCELED';
  }

  private validateSource(value: string): ActionPlanTaskSource {
    if (VALID_SOURCES.includes(value as ActionPlanTaskSource)) {
      return value as ActionPlanTaskSource;
    }

    throw new Error('INVALID_ACTION_PLAN_SOURCE');
  }

  private validateDate(value: string | null | undefined): string | null {
    if (value == null || value.trim() == '') {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('INVALID_ACTION_PLAN_DUE_DATE');
    }

    return parsed.toISOString();
  }

  private validateResponsibleUser(companyId: string, userId?: string | null): string | null {
    const normalized = userId?.trim();
    if (!normalized) {
      return null;
    }

    const user = this.repository.findUserById(normalized);
    if (!user) {
      throw new Error('RESPONSIBLE_USER_NOT_FOUND');
    }

    if (user.companyId !== companyId) {
      throw new Error('RESPONSIBLE_USER_COMPANY_MISMATCH');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('RESPONSIBLE_USER_INACTIVE');
    }

    return normalized;
  }

  private applyListFilters(
    auth: AuthTokenPayload,
    filters: ActionPlanListFilters,
    tasks: ActionPlanTaskDetails[],
  ): ActionPlanTaskDetails[] {
    const scope = filters.scope ?? 'all';
    const search = filters.search?.trim().toLocaleLowerCase('pt-BR') ?? '';
    const decorated = tasks.map((task) => this.decorateTask(task));

    return decorated.filter((task) => {
      if (
        search &&
        ![
          task.title,
          task.description,
          task.pillar,
          task.responsibleUserName,
          task.responsibleUserEmail,
        ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(search))
      ) {
        return false;
      }

      switch (scope) {
        case 'mine':
          return task.responsibleUserId === auth.userId;
        case 'overdue':
          return task.isOverdue;
        case 'dueSoon':
          return task.isDueSoon;
        case 'critical':
          return task.priority === 'CRITICAL' && this.isActiveTaskStatus(task.status);
        case 'completed':
          return task.status === 'DONE';
        case 'all':
        default:
          return true;
      }
    });
  }

  private decorateTask(task: ActionPlanTaskDetails, now = new Date()): ActionPlanTaskDetails {
    if (!task.dueDate || !this.isActiveTaskStatus(task.status)) {
      return {
        ...task,
        isOverdue: false,
        daysOverdue: 0,
        isDueSoon: false,
      };
    }

    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) {
      return {
        ...task,
        isOverdue: false,
        daysOverdue: 0,
        isDueSoon: false,
      };
    }

    const oneDay = 86_400_000;
    const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
    const daysDifference = Math.round((dueDay - todayDay) / oneDay);

    return {
      ...task,
      isOverdue: daysDifference < 0,
      daysOverdue: daysDifference < 0 ? Math.abs(daysDifference) : 0,
      isDueSoon: daysDifference >= 0 && daysDifference <= 7,
    };
  }

  private validateSubmission(companyId: string, submissionId: string | null): string | null {
    if (!submissionId) {
      return null;
    }

    const submission = this.repository.findSubmissionById(submissionId);
    if (!submission) {
      throw new Error('RESEARCH_SUBMISSION_NOT_FOUND');
    }

    if (submission.company_id !== companyId) {
      throw new Error('SUBMISSION_COMPANY_MISMATCH');
    }

    return submission.id;
  }

  private resolveCompletedAt(
    currentValue: string | null,
    status: ActionPlanTaskStatus,
    updatedAt: string,
  ): string | null {
    if (status === 'DONE') {
      return currentValue ?? updatedAt;
    }

    return null;
  }

  private resolveCompanyId(context: ActionPlanAccessContext, companyId?: string): string {
    if (context.actor.role === 'ADMIN') {
      const normalized = companyId?.trim();
      if (!normalized) {
        throw new Error('COMPANY_ID_REQUIRED');
      }

      const company = this.repository.findCompanyById(normalized);
      if (!company) {
        throw new Error('COMPANY_NOT_FOUND');
      }

      return normalized;
    }

    const actorCompanyId = this.ensureActorCompany(context);
    if (companyId?.trim() && companyId.trim() !== actorCompanyId) {
      throw new Error('FORBIDDEN');
    }

    return actorCompanyId;
  }

  private ensureTaskAccess(context: ActionPlanAccessContext, companyId: string): void {
    if (context.actor.role === 'ADMIN') {
      return;
    }

    if (!context.actor.companyId || context.actor.companyId !== companyId) {
      throw new Error('FORBIDDEN');
    }
  }

  private ensureActorCompany(context: ActionPlanAccessContext): string {
    if (!context.actor.companyId) {
      throw new Error('COMPANY_ID_REQUIRED');
    }

    return context.actor.companyId;
  }

  private ensureActiveUser(context: ActionPlanAccessContext): void {
    if (context.actor.status !== 'ACTIVE') {
      throw new Error('INACTIVE_USER');
    }
  }

  private getAccessContext(auth: AuthTokenPayload): ActionPlanAccessContext {
    const actor = this.repository.findUserById(auth.userId);
    if (!actor) {
      throw new Error('USER_NOT_FOUND');
    }

    return { auth, actor };
  }
}
