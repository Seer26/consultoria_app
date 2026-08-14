import { randomUUID } from 'node:crypto';
import type { AuthTokenPayload } from '../auth/auth.types';
import { StrategyRepository } from './strategy.repository';
import type { StrategicGoal, StrategicObjective, StrategyContext, StrategyPriority, StrategyProfile, StrategyStatus, SwotCategory, SwotItem } from './strategy.types';

const STATUSES: StrategyStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'];
const PRIORITIES: StrategyPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CATEGORIES: SwotCategory[] = ['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT'];

export class StrategyService {
  constructor(private readonly repository: StrategyRepository) {}

  async getSnapshot(auth: AuthTokenPayload, requestedCompanyId?: string) {
    const context = await this.context(auth, requestedCompanyId);
    const profile = await this.repository.getProfile(context.companyId);
    const objectives = await this.repository.listObjectives(context.companyId);
    const swotItems = await this.repository.listSwot(context.companyId);
    const now = Date.now();
    const nextThirtyDays = now + 30 * 86_400_000;
    const goals = objectives.flatMap((item) => item.goals);
    const active = objectives.filter((item) => item.status === 'PLANNED' || item.status === 'IN_PROGRESS');
    const completed = objectives.filter((item) => item.status === 'COMPLETED').length;
    return {
      companyId: context.companyId,
      canEdit: context.actor.role !== 'EMPLOYEE',
      profile: profile ?? { companyId: context.companyId, mission: '', vision: '', values: '', createdAt: null, updatedAt: null },
      objectives,
      swotItems,
      summary: {
        activeObjectives: active.length,
        totalObjectives: objectives.length,
        goalsDueSoon: goals.filter((g) => g.status !== 'COMPLETED' && g.status !== 'CANCELED' && g.dueDate && new Date(g.dueDate).getTime() >= now && new Date(g.dueDate).getTime() <= nextThirtyDays).length,
        progress: objectives.length === 0 ? 0 : Math.round((completed / objectives.length) * 100),
      },
    };
  }

  async listAssignees(auth: AuthTokenPayload, requestedCompanyId?: string) {
    const context = await this.context(auth, requestedCompanyId);
    return this.repository.listAssignees(context.companyId);
  }

  async updateProfile(auth: AuthTokenPayload, input: Record<string, unknown>) {
    const context = await this.mutableContext(auth, input.companyId);
    const now = new Date().toISOString();
    const existing = await this.repository.getProfile(context.companyId);
    const value: StrategyProfile = {
      companyId: context.companyId,
      mission: this.profileText(input, 'mission', existing?.mission ?? ''),
      vision: this.profileText(input, 'vision', existing?.vision ?? ''),
      values: this.profileText(input, 'values', existing?.values ?? ''),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.repository.saveProfile(value);
    return value;
  }

  async createObjective(auth: AuthTokenPayload, input: Record<string, unknown>) {
    const context = await this.mutableContext(auth, input.companyId);
    const now = new Date().toISOString();
    const value = await this.objectiveValue(context, input, {
      id: randomUUID(), companyId: context.companyId, title: '', description: '', status: 'PLANNED', priority: 'MEDIUM', startDate: null, dueDate: null, responsibleUserId: null, responsibleUserName: null, notes: '', createdAt: now, updatedAt: now, goals: [],
    });
    await this.repository.saveObjective(value, true);
    return this.repository.findObjective(value.id);
  }

  async updateObjective(auth: AuthTokenPayload, id: string, input: Record<string, unknown>) {
    const existing = await this.repository.findObjective(id);
    if (!existing) throw new Error('STRATEGIC_OBJECTIVE_NOT_FOUND');
    const context = await this.mutableContext(auth, input.companyId);
    this.sameCompany(context, existing.companyId);
    const value = await this.objectiveValue(context, input, existing);
    await this.repository.saveObjective(value, false);
    return this.repository.findObjective(id);
  }

  async createGoal(auth: AuthTokenPayload, objectiveId: string, input: Record<string, unknown>) {
    const objective = await this.repository.findObjective(objectiveId);
    if (!objective) throw new Error('STRATEGIC_OBJECTIVE_NOT_FOUND');
    const context = await this.mutableContext(auth, input.companyId);
    this.sameCompany(context, objective.companyId);
    const now = new Date().toISOString();
    const value = this.goalValue(input, { id: randomUUID(), companyId: context.companyId, objectiveId, title: '', description: '', initialValue: null, targetValue: null, unit: null, currentValue: null, dueDate: null, status: 'PLANNED', createdAt: now, updatedAt: now });
    await this.repository.saveGoal(value, true);
    return this.repository.findGoal(value.id);
  }

  async updateGoal(auth: AuthTokenPayload, id: string, input: Record<string, unknown>) {
    const existing = await this.repository.findGoal(id);
    if (!existing) throw new Error('STRATEGIC_GOAL_NOT_FOUND');
    const context = await this.mutableContext(auth, input.companyId);
    this.sameCompany(context, existing.companyId);
    const value = this.goalValue(input, existing);
    await this.repository.saveGoal(value, false);
    return this.repository.findGoal(id);
  }

  async createSwot(auth: AuthTokenPayload, input: Record<string, unknown>) {
    const context = await this.mutableContext(auth, input.companyId);
    const now = new Date().toISOString();
    const value = this.swotValue(input, { id: randomUUID(), companyId: context.companyId, category: 'STRENGTH', title: '', description: '', createdAt: now, updatedAt: now });
    await this.repository.saveSwot(value, true);
    return this.repository.findSwot(value.id);
  }
  async updateSwot(auth: AuthTokenPayload, id: string, input: Record<string, unknown>) {
    const existing = await this.repository.findSwot(id);
    if (!existing) throw new Error('SWOT_ITEM_NOT_FOUND');
    const context = await this.mutableContext(auth, input.companyId);
    this.sameCompany(context, existing.companyId);
    const value = this.swotValue(input, existing);
    await this.repository.saveSwot(value, false);
    return this.repository.findSwot(id);
  }
  async deleteSwot(auth: AuthTokenPayload, id: string, requestedCompanyId?: unknown) {
    const existing = await this.repository.findSwot(id);
    if (!existing) throw new Error('SWOT_ITEM_NOT_FOUND');
    const context = await this.mutableContext(auth, requestedCompanyId);
    this.sameCompany(context, existing.companyId);
    await this.repository.deleteSwot(id, context.companyId);
  }

  private async objectiveValue(context: StrategyContext, input: Record<string, unknown>, old: StrategicObjective): Promise<StrategicObjective> {
    const responsible = this.optionalText(input.responsibleUserId);
    if (responsible) {
      const user = await this.repository.findEmployee(responsible);
      if (!user || user.companyId !== context.companyId || user.role !== 'EMPLOYEE' || user.status !== 'ACTIVE') throw new Error('STRATEGY_RESPONSIBLE_INVALID');
    }
    return { ...old, title: this.text(input.title, 'STRATEGIC_OBJECTIVE_TITLE_REQUIRED', 200), description: this.optionalText(input.description, 4000) ?? '', status: this.status(input.status ?? old.status), priority: this.priority(input.priority ?? old.priority), startDate: this.date(input.startDate), dueDate: this.date(input.dueDate), responsibleUserId: responsible, notes: this.optionalText(input.notes, 4000) ?? '', updatedAt: new Date().toISOString() };
  }
  private goalValue(input: Record<string, unknown>, old: StrategicGoal): StrategicGoal {
    return { ...old, title: this.text(input.title, 'STRATEGIC_GOAL_TITLE_REQUIRED', 200), description: this.optionalText(input.description, 4000) ?? '', initialValue: this.number(input.initialValue), targetValue: this.number(input.targetValue), currentValue: this.number(input.currentValue), unit: this.optionalText(input.unit, 50), dueDate: this.date(input.dueDate), status: this.status(input.status ?? old.status), updatedAt: new Date().toISOString() };
  }
  private swotValue(input: Record<string, unknown>, old: SwotItem): SwotItem {
    const category = String(input.category ?? old.category).toUpperCase() as SwotCategory;
    if (!CATEGORIES.includes(category)) throw new Error('INVALID_SWOT_CATEGORY');
    return { ...old, category, title: this.text(input.title, 'SWOT_TITLE_REQUIRED', 200), description: this.optionalText(input.description, 4000) ?? '', updatedAt: new Date().toISOString() };
  }
  private async context(auth: AuthTokenPayload, requested?: unknown): Promise<StrategyContext> {
    const actor = await this.repository.findActor(auth.userId);
    if (!actor) throw new Error('USER_NOT_FOUND');
    if (actor.status !== 'ACTIVE') throw new Error('INACTIVE_USER');
    const requestedId = this.optionalText(requested);
    const companyId = actor.role === 'ADMIN' ? requestedId : actor.companyId;
    if (!companyId) throw new Error('COMPANY_ID_REQUIRED');
    if (actor.role !== 'ADMIN' && requestedId && requestedId !== actor.companyId) throw new Error('FORBIDDEN');
    if (!(await this.repository.companyExists(companyId))) throw new Error('COMPANY_NOT_FOUND');
    return { auth, actor, companyId };
  }
  private async mutableContext(auth: AuthTokenPayload, requested?: unknown) { const c = await this.context(auth, requested); if (c.actor.role === 'EMPLOYEE') throw new Error('STRATEGY_READ_ONLY'); return c; }
  private sameCompany(c: StrategyContext, companyId: string) { if (c.companyId !== companyId) throw new Error('FORBIDDEN'); }
  private profileText(input: Record<string, unknown>, key: string, previous: string) {
    if (!(key in input)) return previous;
    return this.optionalText(input[key], 4000) ?? '';
  }
  private text(v: unknown, code: string, max: number) { const s = String(v ?? '').trim(); if (!s) throw new Error(code); if (s.length > max) throw new Error('STRATEGY_TEXT_TOO_LONG'); return s; }
  private optionalText(v: unknown, max = 200): string | null { if (v == null) return null; const s = String(v).trim(); if (!s) return null; if (s.length > max) throw new Error('STRATEGY_TEXT_TOO_LONG'); return s; }
  private status(v: unknown): StrategyStatus { const s = String(v).toUpperCase() as StrategyStatus; if (!STATUSES.includes(s)) throw new Error('INVALID_STRATEGY_STATUS'); return s; }
  private priority(v: unknown): StrategyPriority { const s = String(v).toUpperCase() as StrategyPriority; if (!PRIORITIES.includes(s)) throw new Error('INVALID_STRATEGY_PRIORITY'); return s; }
  private date(v: unknown): string | null { const s = this.optionalText(v); if (!s) return null; const d = new Date(s); if (Number.isNaN(d.getTime())) throw new Error('INVALID_STRATEGY_DATE'); return d.toISOString(); }
  private number(v: unknown): number | null { if (v == null || v === '') return null; const n = Number(v); if (!Number.isFinite(n)) throw new Error('INVALID_STRATEGY_NUMBER'); return n; }
}
