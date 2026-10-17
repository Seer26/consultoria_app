import { randomUUID } from 'node:crypto';
import type { AuthTokenPayload } from '../auth/auth.types';
import { buildTasksFromResearch } from './action-plan.generation';
import { ActionPlanRepository } from './action-plan.repository';
import { planStatuses, taskPriorities, taskStatuses } from './action-plan.types';
import type { ActionPlanGenerationResult, ActionPlanTaskDetails, Evidence, HistoryEvent, Plan, Scope, TaskFilters, TaskRecord } from './action-plan.types';

export class ActionPlanError extends Error {
  constructor(public readonly status: number, code: string) { super(code); }
}
const fail = (status: number, code: string): never => { throw new ActionPlanError(status, code); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'INVALID_BODY');
  return value as Record<string, unknown>;
}
function text(value: unknown, required = false, max = 4000): string {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, 'INVALID_TEXT');
  return (value as string).trim();
}
function enumeration<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) fail(400, 'INVALID_ENUM');
  return value as T;
}
function percentage(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) fail(400, 'INVALID_PROGRESS');
  return value as number;
}
function date(value: unknown, end = false): string | null {
  if (value === undefined || value === null || value === '') return null;
  const raw = text(value, true, 50);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  if (!dateOnly && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(raw)) fail(400, 'INVALID_DATE');
  const day = raw.slice(0, 10);
  const calendar = new Date(day + 'T00:00:00Z');
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) fail(400, 'INVALID_DATE');
  const parsed = new Date(dateOnly ? raw + (end ? 'T23:59:59.999Z' : 'T00:00:00.000Z') : raw);
  if (!Number.isFinite(parsed.getTime()) || (dateOnly && parsed.toISOString().slice(0, 10) !== raw)) fail(400, 'INVALID_DATE');
  return parsed.toISOString();
}
function dates(start: string | null, due: string | null): void {
  if (start && due && start > due) fail(400, 'INVALID_DATE_RANGE');
}
function summary(tasks: ActionPlanTaskDetails[]) {
  const valid = tasks.filter(t => t.status !== 'CANCELADA');
  return {
    total: tasks.length, pending: tasks.filter(t => t.status === 'PENDENTE').length,
    inProgress: tasks.filter(t => t.status === 'EM_ANDAMENTO').length,
    awaitingValidation: tasks.filter(t => t.status === 'AGUARDANDO_VALIDACAO').length,
    completed: tasks.filter(t => t.status === 'CONCLUIDA').length,
    canceled: tasks.filter(t => t.status === 'CANCELADA').length,
    overdue: tasks.filter(t => t.overdue).length,
    progress: valid.length ? Math.round(valid.reduce((n, t) => n + t.progress, 0) / valid.length * 10) / 10 : 0,
  };
}

export class ActionPlanService {
  constructor(private readonly repository: ActionPlanRepository) {}

  private scope(auth: AuthTokenPayload, requested?: unknown): Scope {
    const actor = this.repository.actor(auth.userId);
    if (!actor || actor.status !== 'ACTIVE' || !['ADMIN', 'OWNER', 'EMPLOYEE'].includes(actor.role)) return fail(403, 'INACTIVE_USER');
    let companyId = actor.companyId;
    if (!companyId && actor.role === 'ADMIN') companyId = text(requested, true, 200);
    else if (requested !== undefined && requested !== '' && requested !== companyId) fail(403, 'FORBIDDEN');
    if (!companyId || !this.repository.company(companyId)) return fail(403, 'INACTIVE_COMPANY');
    return { actor, companyId, ...(actor.role === 'EMPLOYEE' ? { employeeId: actor.id } : {}) };
  }
  private management(scope: Scope): void { if (scope.actor.role === 'EMPLOYEE') fail(403, 'FORBIDDEN'); }
  private plan(scope: Scope, id: string): Plan { return this.repository.plan(scope, id) ?? fail(404, 'PLAN_NOT_FOUND'); }
  private task(scope: Scope, id: string): ActionPlanTaskDetails { return this.repository.task(scope, id) ?? fail(404, 'TASK_NOT_FOUND'); }
  private responsible(scope: Scope, value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    const id = text(value, true, 200);
    const user = this.repository.actor(id);
    if (!user || user.companyId !== scope.companyId || user.status !== 'ACTIVE') return fail(400, 'INVALID_RESPONSIBLE');
    return id;
  }
  private event(scope: Scope, taskId: string, event: HistoryEvent, oldValue: unknown, newValue: unknown): void {
    this.repository.addHistory({ id: randomUUID(), taskId, companyId: scope.companyId, event, actorId: scope.actor.id, actorName: scope.actor.name, oldValue, newValue, createdAt: new Date().toISOString() });
  }
  listPlans(auth: AuthTokenPayload, companyId?: unknown) { return this.repository.plans(this.scope(auth, companyId)); }
  getPlan(auth: AuthTokenPayload, id: string, companyId?: unknown) { return this.plan(this.scope(auth, companyId), id); }
  createPlan(auth: AuthTokenPayload, value: unknown, companyId?: unknown): Plan {
    const input = object(value);
    const scope = this.scope(auth, input.companyId ?? companyId);
    this.management(scope);
    const submissionId = input.submissionId == null || input.submissionId === '' ? null : text(input.submissionId, true, 200);
    if (submissionId && !this.repository.submission(submissionId, scope.companyId)) fail(404, 'DIAGNOSIS_NOT_FOUND');
    const now = new Date().toISOString();
    const plan: Plan = { id: randomUUID(), companyId: scope.companyId, submissionId, title: text(input.title, true, 200), description: input.description === undefined ? '' : text(input.description),
      status: input.status === undefined ? 'RASCUNHO' : enumeration(input.status, planStatuses), startDate: date(input.startDate), dueDate: date(input.dueDate, true), createdBy: scope.actor.id, createdAt: now, updatedAt: now, progress: 0 };
    if (plan.status === 'CONCLUIDO') fail(409, 'PLAN_HAS_UNFINISHED_TASKS');
    dates(plan.startDate, plan.dueDate);
    this.repository.insertPlan(plan);
    return plan;
  }
  updatePlan(auth: AuthTokenPayload, id: string, value: unknown, companyId?: unknown): Plan {
    const input = object(value), scope = this.scope(auth, companyId);
    const current = this.plan(scope, id); this.management(scope);
    if (Object.keys(input).some(k => !['title', 'description', 'status', 'startDate', 'dueDate'].includes(k))) fail(400, 'INVALID_FIELD');
    const plan: Plan = { ...current, title: input.title === undefined ? current.title : text(input.title, true, 200), description: input.description === undefined ? current.description : text(input.description),
      status: input.status === undefined ? current.status : enumeration(input.status, planStatuses),
      startDate: input.startDate === undefined ? current.startDate : date(input.startDate), dueDate: input.dueDate === undefined ? current.dueDate : date(input.dueDate, true), updatedAt: new Date().toISOString() };
    dates(plan.startDate, plan.dueDate);
    this.repository.atomic(() => {
      const tasks = this.repository.tasks(scope, { planId: id }).filter(t => t.status !== 'CANCELADA');
      if (plan.status === 'CONCLUIDO' && (!tasks.length || tasks.some(t => t.status !== 'CONCLUIDA'))) fail(409, 'PLAN_HAS_UNFINISHED_TASKS');
      this.repository.updatePlan(plan);
    });
    return this.plan(scope, id);
  }
  private filters(input: Record<string, unknown>): TaskFilters {
    const f: TaskFilters = {};
    for (const key of ['planId', 'submissionId', 'responsibleUserId'] as const) if (input[key] !== undefined && input[key] !== '') f[key] = text(input[key], true, 200);
    if (input.status) f.status = enumeration(input.status, taskStatuses);
    if (input.priority) f.priority = enumeration(input.priority, taskPriorities);
    for (const key of ['overdue', 'completed'] as const) {
      if (input[key] !== undefined && input[key] !== '') {
        if (!['true', 'false', true, false].includes(input[key] as string | boolean)) fail(400, 'INVALID_FILTER');
        f[key] = input[key] === true || input[key] === 'true';
      }
    }
    return f;
  }
  listTasks(auth: AuthTokenPayload, input: Record<string, unknown> = {}) {
    const scope = this.scope(auth, input.companyId), filters = this.filters(input);
    if (filters.planId) this.plan(scope, filters.planId);
    if (scope.employeeId && filters.responsibleUserId && filters.responsibleUserId !== scope.employeeId) fail(403, 'FORBIDDEN');
    return this.repository.tasks(scope, filters);
  }
  getTaskById(auth: AuthTokenPayload, id: string, companyId?: unknown) { return this.task(this.scope(auth, companyId), id); }
  createTask(auth: AuthTokenPayload, value: unknown, companyId?: unknown): ActionPlanTaskDetails {
    const input = object(value), scope = this.scope(auth, input.companyId ?? companyId);
    this.management(scope);
    const plan = this.plan(scope, text(input.planId, true, 200));
    if (plan.status === 'CANCELADO' || plan.status === 'CONCLUIDO') fail(409, 'PLAN_CLOSED');
    const now = new Date().toISOString();
    const status = input.status === undefined ? 'PENDENTE' : enumeration(input.status, taskStatuses);
    const progress = input.progress === undefined ? 0 : percentage(input.progress);
    const task: TaskRecord = { id: randomUUID(), companyId: scope.companyId, planId: plan.id, submissionId: plan.submissionId,
      title: text(input.title, true, 200), description: input.description === undefined ? '' : text(input.description), pillar: input.pillar == null ? null : text(input.pillar, false, 100),
      priority: input.priority === undefined ? 'MEDIA' : enumeration(input.priority, taskPriorities), status,
      startDate: date(input.startDate), dueDate: date(input.dueDate, true), responsibleUserId: this.responsible(scope, input.responsibleUserId),
      progress: status === 'CONCLUIDA' ? 100 : progress, notes: input.notes === undefined ? '' : text(input.notes), source: 'MANUAL',
      createdAt: now, updatedAt: now, completedAt: status === 'CONCLUIDA' ? now : null };
    dates(task.startDate, task.dueDate);
    this.repository.atomic(() => { this.repository.insertTask(task); this.event(scope, task.id, 'CRIACAO', null, task); });
    return this.task(scope, task.id);
  }
  updateTask(auth: AuthTokenPayload, id: string, value: unknown, companyId?: unknown): ActionPlanTaskDetails {
    const input = object(value), scope = this.scope(auth, companyId), current = this.task(scope, id);
    const plan = this.plan(scope, current.planId);
    const employee = scope.actor.role === 'EMPLOYEE';
    const allowed = employee ? ['status', 'progress', 'notes'] : ['title', 'description', 'pillar', 'priority', 'status', 'startDate', 'dueDate', 'responsibleUserId', 'progress', 'notes'];
    if (Object.keys(input).some(k => !allowed.includes(k))) fail(employee ? 403 : 400, 'FORBIDDEN_FIELD');
    const status = input.status === undefined ? current.status : enumeration(input.status, taskStatuses);
    const terminal = ['CONCLUIDA', 'CANCELADA'].includes(current.status);
    if (employee && (terminal || plan.status !== 'ATIVO' || !['PENDENTE', 'EM_ANDAMENTO', 'AGUARDANDO_VALIDACAO'].includes(status))) fail(403, 'FORBIDDEN');
    const reopening = terminal && !['CONCLUIDA', 'CANCELADA'].includes(status);
    if (plan.status === 'CANCELADO' || (plan.status === 'CONCLUIDO' && !reopening)) fail(409, 'PLAN_CLOSED');
    let progress = input.progress === undefined ? (reopening ? 0 : current.progress) : percentage(input.progress);
    if (status === 'CONCLUIDA') {
      if (input.progress !== undefined && progress !== 100) fail(400, 'COMPLETION_REQUIRES_100');
      progress = 100;
    }
    if (reopening && progress === 100) fail(400, 'REOPEN_REQUIRES_INCOMPLETE_PROGRESS');
    const now = new Date().toISOString();
    const task: TaskRecord = { ...current,
      title: input.title === undefined ? current.title : text(input.title, true, 200), description: input.description === undefined ? current.description : text(input.description),
      pillar: input.pillar === undefined ? current.pillar : input.pillar === null ? null : text(input.pillar, false, 100),
      priority: input.priority === undefined ? current.priority : enumeration(input.priority, taskPriorities), status, progress,
      startDate: input.startDate === undefined ? current.startDate : date(input.startDate), dueDate: input.dueDate === undefined ? current.dueDate : date(input.dueDate, true),
      responsibleUserId: input.responsibleUserId === undefined ? current.responsibleUserId : this.responsible(scope, input.responsibleUserId),
      notes: input.notes === undefined ? current.notes : text(input.notes), updatedAt: now, completedAt: status === 'CONCLUIDA' ? current.completedAt ?? now : null };
    dates(task.startDate, task.dueDate);
    this.repository.atomic(() => {
      this.repository.updateTask(task);
      const changes: [keyof TaskRecord, HistoryEvent][] = [['responsibleUserId', 'RESPONSAVEL'], ['dueDate', 'PRAZO'], ['priority', 'PRIORIDADE'], ['status', 'STATUS'], ['progress', 'PROGRESSO'], ['title', 'EDICAO'], ['description', 'EDICAO'], ['notes', 'EDICAO'], ['startDate', 'EDICAO'], ['pillar', 'EDICAO']];
      for (const [key, event] of changes) if (current[key] !== task[key]) this.event(scope, id, event, current[key], task[key]);
      if (current.status !== 'CONCLUIDA' && status === 'CONCLUIDA') this.event(scope, id, 'CONCLUSAO', current.status, status);
      if (reopening) {
        this.event(scope, id, 'REABERTURA', current.status, status);
        if (plan.status === 'CONCLUIDO') this.repository.updatePlan({ ...plan, status: 'ATIVO', updatedAt: now });
      }
    });
    return this.task(scope, id);
  }
  updateTaskStatus(auth: AuthTokenPayload, id: string, value: unknown, companyId?: unknown) {
    const input = object(value);
    if (!Object.prototype.hasOwnProperty.call(input, 'status')) fail(400, 'STATUS_REQUIRED');
    // Preserve unknown keys so attempts to forge company/actor cannot be silently accepted.
    return this.updateTask(auth, id, input, companyId);
  }
  getEvidence(auth: AuthTokenPayload, id: string, companyId?: unknown) { const scope = this.scope(auth, companyId); this.task(scope, id); return this.repository.evidence(scope, id); }
  getHistory(auth: AuthTokenPayload, id: string, companyId?: unknown) { const scope = this.scope(auth, companyId); this.task(scope, id); return this.repository.history(scope, id); }
  addEvidence(auth: AuthTokenPayload, id: string, value: unknown, companyId?: unknown): Evidence {
    const scope = this.scope(auth, companyId), task = this.task(scope, id), input = object(value);
    const plan = this.plan(scope, task.planId);
    if (scope.employeeId && (plan.status !== 'ATIVO' || ['CONCLUIDA', 'CANCELADA'].includes(task.status))) fail(403, 'FORBIDDEN');
    if (plan.status === 'CANCELADO') fail(409, 'PLAN_CLOSED');
    const type = enumeration(input.type, ['COMENTARIO', 'LINK'] as const), content = text(input.content, true);
    if (type === 'LINK') {
      let url: URL;
      try { url = new URL(content); } catch { return fail(400, 'INVALID_LINK'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) fail(400, 'INVALID_LINK');
    }
    const evidence: Evidence = { id: randomUUID(), taskId: id, companyId: scope.companyId, type, content, createdBy: scope.actor.id, createdAt: new Date().toISOString() };
    this.repository.atomic(() => { this.repository.addEvidence(evidence); this.event(scope, id, 'EVIDENCIA_ADICIONADA', null, { id: evidence.id, type, content }); });
    return evidence;
  }
  dashboard(auth: AuthTokenPayload, input: Record<string, unknown> = {}) { return summary(this.listTasks(auth, input)); }
  members(auth: AuthTokenPayload, companyId?: unknown) { const scope = this.scope(auth, companyId); this.management(scope); return this.repository.members(scope); }
  employees(auth: AuthTokenPayload, input: Record<string, unknown> = {}) {
    const scope = this.scope(auth, input.companyId), tasks = this.listTasks(auth, input);
    return this.repository.members(scope).filter(user => user.role === 'EMPLOYEE' && (!scope.employeeId || user.id === scope.employeeId))
      .map(user => ({ ...user, ...summary(tasks.filter(t => t.responsibleUserId === user.id)) }));
  }
  generateFromResearch(auth: AuthTokenPayload, input: { submissionId: string; companyId: string; status: string; criticalPoints: string[]; opportunities: string[]; recommendations: string[]; nextSteps: string[]; pillarScores: { pillar: string; score: number }[] }): ActionPlanGenerationResult {
    const scope = this.scope(auth, input.companyId); this.management(scope);
    if (!this.repository.submission(input.submissionId, scope.companyId)) fail(404, 'DIAGNOSIS_NOT_FOUND');
    if (input.status !== 'COMPLETED') fail(409, 'ACTION_PLAN_SUBMISSION_NOT_COMPLETED');
    return this.repository.atomic(() => {
      const existing = this.repository.plans(scope).find(p => p.submissionId === input.submissionId);
      if (existing) return { submissionId: input.submissionId, companyId: scope.companyId, planId: existing.id, alreadyGenerated: true, createdCount: 0, tasks: this.repository.tasks(scope, { planId: existing.id }) };
      const plan = this.createPlan(auth, { companyId: scope.companyId, submissionId: input.submissionId, title: 'Plano de ação da pesquisa', status: 'ATIVO' });
      const generated = buildTasksFromResearch({ ...input, planId: plan.id });
      for (const task of generated) {
        this.repository.insertTask(task);
        this.event(scope, task.id, 'CRIACAO', null, task);
      }
      return { submissionId: input.submissionId, companyId: scope.companyId, planId: plan.id, alreadyGenerated: false, createdCount: generated.length, tasks: this.repository.tasks(scope, { planId: plan.id }) };
    });
  }
}
