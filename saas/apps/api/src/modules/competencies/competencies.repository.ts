import { dataSource, type DataSource } from '../../database/data-source';
import type { BehavioralUser } from '../behavioral/behavioral.types';
import type { Competency, CompetencyAssessment, CompetencyItem, CompetencyStatus, CompetencyAssessmentFilters, CompetenciesRepositoryContract } from './competencies.types';

type Source = Pick<DataSource, 'one' | 'many' | 'execute' | 'transaction' | 'provider'>;
type CatalogRow = { id: string; company_id: string | null; scope: Competency['scope']; name: string; description: string; category: string | null; status: CompetencyStatus; created_at: string; updated_at: string };
type AssessmentRow = { id: string; company_id: string; subject_user_id: string; started_by_user_id: string; completed_by_user_id: string | null; subject_name_snapshot: string; started_by_name_snapshot: string; completed_by_name_snapshot: string | null; status: CompetencyAssessment['status']; started_at: string; completed_at: string | null; created_at: string };
type ItemRow = { id: string; assessment_id: string; competency_id: string; competency_name_snapshot: string; competency_description_snapshot: string; competency_category_snapshot: string | null; competency_scope_snapshot: Competency['scope']; evidence_status: CompetencyItem['evidenceStatus']; level: number | null; observation: string | null; created_at: string; updated_at: string };
const catalog = (r: CatalogRow): Competency => ({ id: r.id, companyId: r.company_id, scope: r.scope, name: r.name, description: r.description, category: r.category, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at });
const assessment = (r: AssessmentRow): CompetencyAssessment => ({ id: r.id, companyId: r.company_id, subjectUserId: r.subject_user_id, startedByUserId: r.started_by_user_id, completedByUserId: r.completed_by_user_id, subjectNameSnapshot: r.subject_name_snapshot, startedByNameSnapshot: r.started_by_name_snapshot, completedByNameSnapshot: r.completed_by_name_snapshot, status: r.status, startedAt: r.started_at, completedAt: r.completed_at, createdAt: r.created_at });
const item = (r: ItemRow): CompetencyItem => ({ id: r.id, assessmentId: r.assessment_id, competencyId: r.competency_id, competencyNameSnapshot: r.competency_name_snapshot, competencyDescriptionSnapshot: r.competency_description_snapshot, competencyCategorySnapshot: r.competency_category_snapshot, competencyScopeSnapshot: r.competency_scope_snapshot, evidenceStatus: r.evidence_status, level: r.level, observation: r.observation, createdAt: r.created_at, updatedAt: r.updated_at });

export class CompetenciesRepository implements CompetenciesRepositoryContract {
  constructor(private readonly source: Source = dataSource) {}
  transaction<T>(operation: () => Promise<T>) { return this.source.transaction(operation); }
  private lock(lock: boolean) { return lock && this.source.provider === 'postgres' ? ' FOR UPDATE' : ''; }
  async companyExists(id: string) { return Boolean(await this.source.one('SELECT id FROM companies WHERE id = ?', [id])); }
  async findUser(id: string, lock = false): Promise<BehavioralUser | null> {
    const r = await this.source.one<{ id: string; name: string; role: BehavioralUser['role']; company_id: string | null; status: BehavioralUser['status'] }>(`SELECT id, name, role, company_id, status FROM users WHERE id = ?${this.lock(lock)}`, [id]);
    return r ? { id: r.id, name: r.name, role: r.role, companyId: r.company_id, status: r.status } : null;
  }
  async listCatalog(companyId: string, status?: CompetencyStatus) {
    const params: string[] = [companyId]; if (status) params.push(status);
    return (await this.source.many<CatalogRow>(`SELECT * FROM competencies WHERE (scope = 'SYSTEM' OR (scope = 'COMPANY' AND company_id = ?))${status ? ' AND status = ?' : ''} ORDER BY name, id`, params)).map(catalog);
  }
  async findCompetency(id: string, lock = false) {
    const r = await this.source.one<CatalogRow>(`SELECT * FROM competencies WHERE id = ?${this.lock(lock)}`, [id]);
    return r ? catalog(r) : null;
  }
  async createCompetency(c: Competency) {
    await this.source.execute(`INSERT INTO competencies (id, company_id, scope, name, description, category, status, created_at, updated_at)
      VALUES (@id, @companyId, @scope, @name, @description, @category, @status, @createdAt, @updatedAt)`, c);
  }
  async updateCompetency(c: Competency) {
    await this.source.execute(`UPDATE competencies SET name = @name, description = @description, category = @category, status = @status, updated_at = @updatedAt
      WHERE id = @id AND company_id = @companyId AND scope = 'COMPANY'`, c);
  }
  async findCurrent(companyId: string, userId: string) {
    const r = await this.source.one<AssessmentRow>("SELECT * FROM competency_assessments WHERE company_id = ? AND subject_user_id = ? AND status = 'IN_PROGRESS'", [companyId, userId]);
    return r ? assessment(r) : null;
  }
  async createAssessment(a: CompetencyAssessment) {
    // Avoid aborting the PostgreSQL transaction on a concurrent unique-draft conflict.
    const result = await this.source.execute(`INSERT INTO competency_assessments
      (id, company_id, subject_user_id, started_by_user_id, completed_by_user_id, subject_name_snapshot, started_by_name_snapshot, completed_by_name_snapshot, status, started_at, completed_at, created_at)
      VALUES (@id, @companyId, @subjectUserId, @startedByUserId, @completedByUserId, @subjectNameSnapshot, @startedByNameSnapshot, @completedByNameSnapshot, @status, @startedAt, @completedAt, @createdAt)
      ON CONFLICT (company_id, subject_user_id) WHERE status = 'IN_PROGRESS' DO NOTHING`, a);
    return result.changes === 1;
  }
  async findAssessment(id: string, lock = false) {
    // SELECT also locks completed rows without invoking immutable-header UPDATE guards.
    const r = await this.source.one<AssessmentRow>(`SELECT * FROM competency_assessments WHERE id = ?${this.lock(lock)}`, [id]);
    return r ? assessment(r) : null;
  }
  async items(id: string) { return (await this.source.many<ItemRow>('SELECT * FROM competency_assessment_items WHERE assessment_id = ? ORDER BY created_at, id', [id])).map(item); }
  async saveItem(i: CompetencyItem) {
    // Existing snapshots and created_at are intentionally excluded from conflict updates.
    await this.source.execute(`INSERT INTO competency_assessment_items
      (id, assessment_id, competency_id, competency_name_snapshot, competency_description_snapshot, competency_category_snapshot, competency_scope_snapshot, evidence_status, level, observation, created_at, updated_at)
      VALUES (@id, @assessmentId, @competencyId, @competencyNameSnapshot, @competencyDescriptionSnapshot, @competencyCategorySnapshot, @competencyScopeSnapshot, @evidenceStatus, @level, @observation, @createdAt, @updatedAt)
      ON CONFLICT (assessment_id, competency_id) DO UPDATE SET evidence_status = excluded.evidence_status, level = excluded.level, observation = excluded.observation, updated_at = excluded.updated_at`, i);
  }
  async removeItem(assessmentId: string, competencyId: string) {
    await this.source.execute('DELETE FROM competency_assessment_items WHERE assessment_id = ? AND competency_id = ?', [assessmentId, competencyId]);
  }
  async completeAssessment(a: CompetencyAssessment) {
    const result = await this.source.execute(`UPDATE competency_assessments SET status = 'COMPLETED', completed_at = @completedAt, completed_by_user_id = @completedByUserId, completed_by_name_snapshot = @completedByNameSnapshot
      WHERE id = @id AND status = 'IN_PROGRESS'`, a);
    if (result.changes !== 1) throw new Error('COMPETENCIES_ASSESSMENT_COMPLETED');
  }
  async listAssessments(companyId: string, filters: CompetencyAssessmentFilters = {}) {
    const params = [companyId], conditions = ['company_id = ?'];
    if (filters.userId) { conditions.push('subject_user_id = ?'); params.push(filters.userId); }
    if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
    return (await this.source.many<AssessmentRow>(`SELECT * FROM competency_assessments WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC, id DESC`, params)).map(assessment);
  }
}
