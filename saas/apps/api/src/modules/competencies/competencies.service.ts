import { randomUUID } from 'node:crypto';
import type { AuthTokenPayload } from '../auth/auth.types';
import type { BehavioralUser } from '../behavioral/behavioral.types';
import type {
  AdminCompetencyAssessmentDto, Competency, CompetencyAssessment, CompetencyAssessmentFilters,
  CompetencyCatalogFilters, CompetenciesRepositoryContract, CompetencyItem, CreateCompanyCompetencyInput,
  SaveCompetencyItemInput, UpdateCompanyCompetencyInput,
} from './competencies.types';

export class CompetenciesService {
  constructor(private readonly repository: CompetenciesRepositoryContract) {}

  async listCatalog(actor: AuthTokenPayload, companyId: string, filters: CompetencyCatalogFilters = {}): Promise<Competency[]> {
    await this.adminCompany(actor, companyId);
    if (filters.status !== undefined && !['ACTIVE', 'INACTIVE'].includes(filters.status)) throw new Error('COMPETENCIES_INVALID_STATUS');
    return this.repository.listCatalog(companyId, filters.status ?? 'ACTIVE');
  }

  async createCompanyCompetency(actor: AuthTokenPayload, companyId: string, input: CreateCompanyCompetencyInput): Promise<Competency> {
    return this.repository.transaction(async () => {
      await this.adminCompany(actor, companyId);
      const fields = this.catalogInput(input, false), now = new Date().toISOString();
      const competency: Competency = { id: randomUUID(), companyId, scope: 'COMPANY', name: fields.name!, description: fields.description!, category: fields.category ?? null, status: 'ACTIVE', createdAt: now, updatedAt: now };
      await this.repository.createCompetency(competency);
      return competency;
    });
  }

  async updateCompanyCompetency(actor: AuthTokenPayload, companyId: string, competencyId: string, input: UpdateCompanyCompetencyInput): Promise<Competency> {
    return this.repository.transaction(async () => {
      await this.adminCompany(actor, companyId);
      const competency = await this.mutableCompetency(companyId, competencyId);
      const updated = { ...competency, ...this.catalogInput(input, true), updatedAt: new Date().toISOString() };
      await this.repository.updateCompetency(updated);
      return updated;
    });
  }

  async deactivateCompanyCompetency(actor: AuthTokenPayload, companyId: string, competencyId: string): Promise<Competency> {
    return this.repository.transaction(async () => {
      await this.adminCompany(actor, companyId);
      const competency = await this.mutableCompetency(companyId, competencyId);
      const updated: Competency = { ...competency, status: 'INACTIVE', updatedAt: new Date().toISOString() };
      await this.repository.updateCompetency(updated);
      return updated;
    });
  }

  async startOrResumeAssessment(actor: AuthTokenPayload, companyId: string, userId: string): Promise<CompetencyAssessment> {
    return this.repository.transaction(async () => {
      const admin = await this.adminCompany(actor, companyId);
      const subject = await this.companyUser(companyId, userId, true);
      const existing = await this.repository.findCurrent(companyId, userId);
      if (existing) return existing;
      const now = new Date().toISOString();
      const assessment: CompetencyAssessment = { id: randomUUID(), companyId, subjectUserId: userId,
        startedByUserId: admin.id, completedByUserId: null, subjectNameSnapshot: subject.name,
        startedByNameSnapshot: admin.name, completedByNameSnapshot: null,
        status: 'IN_PROGRESS', startedAt: now, completedAt: null, createdAt: now };
      if (await this.repository.createAssessment(assessment)) return assessment;
      // Unique index remains the last defense even when a writer bypasses user locking.
      const winner = await this.repository.findCurrent(companyId, userId);
      if (!winner) throw new Error('COMPETENCIES_ASSESSMENT_CONFLICT');
      return winner;
    });
  }

  async saveItem(actor: AuthTokenPayload, companyId: string, assessmentId: string, competencyId: string, input: SaveCompetencyItemInput): Promise<CompetencyItem> {
    return this.repository.transaction(async () => {
      await this.adminCompany(actor, companyId);
      await this.draft(companyId, assessmentId);
      const value = this.itemInput(input);
      const existing = (await this.repository.items(assessmentId)).find(i => i.competencyId === competencyId);
      // A catalog row lock orders first snapshot capture against edit/deactivation.
      const competency = await this.availableCompetency(companyId, competencyId, true);
      if (!existing && competency.status !== 'ACTIVE') throw new Error('COMPETENCIES_INACTIVE');
      const now = new Date().toISOString();
      const item: CompetencyItem = { ...(existing ?? {
        id: randomUUID(), assessmentId, competencyId, competencyNameSnapshot: competency.name,
        competencyDescriptionSnapshot: competency.description, competencyCategorySnapshot: competency.category,
        competencyScopeSnapshot: competency.scope, createdAt: now,
      }), ...value, updatedAt: now };
      await this.repository.saveItem(item);
      return item;
    });
  }

  async removeItem(actor: AuthTokenPayload, companyId: string, assessmentId: string, competencyId: string): Promise<{ assessmentId: string; competencyId: string }> {
    return this.repository.transaction(async () => {
      await this.adminCompany(actor, companyId);
      await this.draft(companyId, assessmentId);
      await this.availableCompetency(companyId, competencyId);
      await this.repository.removeItem(assessmentId, competencyId);
      return { assessmentId, competencyId };
    });
  }

  async completeAssessment(actor: AuthTokenPayload, companyId: string, assessmentId: string): Promise<{ id: string; status: 'COMPLETED'; completedAt: string }> {
    return this.repository.transaction(async () => {
      const admin = await this.adminCompany(actor, companyId);
      const assessment = await this.draft(companyId, assessmentId);
      const items = await this.repository.items(assessmentId);
      if (items.length === 0) throw new Error('COMPETENCIES_ITEMS_REQUIRED');
      for (const item of items) this.itemInput(item);
      const completedAt = new Date().toISOString();
      await this.repository.completeAssessment({ ...assessment, status: 'COMPLETED', completedAt,
        completedByUserId: admin.id, completedByNameSnapshot: admin.name });
      return { id: assessmentId, status: 'COMPLETED', completedAt };
    });
  }

  async getAdminAssessment(actor: AuthTokenPayload, companyId: string, assessmentId: string): Promise<AdminCompetencyAssessmentDto> {
    await this.adminCompany(actor, companyId);
    const assessment = await this.assessment(companyId, assessmentId);
    return this.dto(assessment);
  }

  async getHistory(actor: AuthTokenPayload, companyId: string, userId: string): Promise<AdminCompetencyAssessmentDto[]> {
    // Persisted company and snapshots authorize historical reads after a subject transfer.
    await this.adminCompany(actor, companyId);
    this.validUserFilter(userId);
    return Promise.all((await this.repository.listAssessments(companyId, { userId })).map(a => this.dto(a)));
  }

  async listCompanyAssessments(actor: AuthTokenPayload, companyId: string, filters: CompetencyAssessmentFilters = {}): Promise<CompetencyAssessment[]> {
    await this.adminCompany(actor, companyId);
    if (filters.status !== undefined && !['IN_PROGRESS', 'COMPLETED'].includes(filters.status)) throw new Error('COMPETENCIES_INVALID_STATUS');
    if (filters.userId !== undefined) this.validUserFilter(filters.userId);
    return this.repository.listAssessments(companyId, filters);
  }

  private validUserFilter(userId: string): void {
    if (typeof userId !== 'string' || !userId.trim()) throw new Error('COMPETENCIES_INVALID_USER');
  }

  private async adminCompany(auth: AuthTokenPayload, companyId: string): Promise<BehavioralUser> {
    const actor = await this.repository.findUser(auth.userId);
    if (!actor) throw new Error('USER_NOT_FOUND');
    if (actor.status !== 'ACTIVE') throw new Error('INACTIVE_USER');
    if (actor.role !== auth.role || actor.companyId !== auth.companyId) throw new Error('FORBIDDEN');
    if (actor.role !== 'ADMIN' || actor.companyId !== null) throw new Error('COMPETENCIES_ADMIN_REQUIRED');
    if (!companyId || !(await this.repository.companyExists(companyId))) throw new Error('COMPANY_NOT_FOUND');
    return actor;
  }

  private async companyUser(companyId: string, userId: string, lock = false): Promise<BehavioralUser> {
    const user = await this.repository.findUser(userId, lock);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.companyId !== companyId) throw new Error('FORBIDDEN');
    return user;
  }

  private async assessment(companyId: string, id: string, lock = false): Promise<CompetencyAssessment> {
    const assessment = await this.repository.findAssessment(id, lock);
    if (!assessment) throw new Error('COMPETENCIES_ASSESSMENT_NOT_FOUND');
    if (assessment.companyId !== companyId) throw new Error('FORBIDDEN');
    return assessment;
  }

  private async draft(companyId: string, id: string): Promise<CompetencyAssessment> {
    // All three mutations share this header lock before status/items/membership checks.
    const assessment = await this.assessment(companyId, id, true);
    if (assessment.status !== 'IN_PROGRESS') throw new Error('COMPETENCIES_ASSESSMENT_COMPLETED');
    await this.companyUser(companyId, assessment.subjectUserId, true);
    return assessment;
  }

  private async availableCompetency(companyId: string, id: string, lock = false): Promise<Competency> {
    const competency = await this.repository.findCompetency(id, lock);
    if (!competency) throw new Error('COMPETENCIES_COMPETENCY_NOT_FOUND');
    if ((competency.scope === 'COMPANY' && competency.companyId !== companyId)
      || (competency.scope === 'SYSTEM' && competency.companyId !== null)) throw new Error('FORBIDDEN');
    return competency;
  }

  private async mutableCompetency(companyId: string, id: string): Promise<Competency> {
    const competency = await this.availableCompetency(companyId, id, true);
    if (competency.scope === 'SYSTEM') throw new Error('COMPETENCIES_SYSTEM_IMMUTABLE');
    return competency;
  }

  private catalogInput(input: UpdateCompanyCompetencyInput, partial: boolean): UpdateCompanyCompetencyInput {
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).some(key => !['name', 'description', 'category'].includes(key))) throw new Error('COMPETENCIES_INVALID_INPUT');
    const fields: UpdateCompanyCompetencyInput = {};
    for (const key of ['name', 'description'] as const) {
      if (!partial || key in input) {
        if (typeof input[key] !== 'string' || !input[key]!.trim()) throw new Error('COMPETENCIES_INVALID_INPUT');
        fields[key] = input[key]!.trim();
      }
    }
    if ('category' in input) {
      if (input.category !== null && typeof input.category !== 'string') throw new Error('COMPETENCIES_INVALID_INPUT');
      fields.category = input.category?.trim() || null;
    }
    if (partial && Object.keys(fields).length === 0) throw new Error('COMPETENCIES_INVALID_INPUT');
    return fields;
  }

  private itemInput(input: SaveCompetencyItemInput): Required<SaveCompetencyItemInput> {
    if (!input || typeof input !== 'object'
      || !((input.evidenceStatus === 'NOT_OBSERVED' && input.level === null)
        || (input.evidenceStatus === 'RATED' && typeof input.level === 'number' && Number.isInteger(input.level) && input.level >= 1 && input.level <= 5))
      || (input.observation !== undefined && input.observation !== null && typeof input.observation !== 'string')) throw new Error('COMPETENCIES_INVALID_ITEM');
    return { evidenceStatus: input.evidenceStatus, level: input.level, observation: input.observation?.trim() || null };
  }

  private async dto(assessment: CompetencyAssessment): Promise<AdminCompetencyAssessmentDto> {
    const items = await this.repository.items(assessment.id);
    return { assessment, items, insufficientEvidence: items.length > 0 && items.every(i => i.evidenceStatus === 'NOT_OBSERVED') };
  }
}
