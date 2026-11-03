import assert from 'node:assert/strict';
import type { AuthTokenPayload } from '../modules/auth/auth.types';
import type { BehavioralUser } from '../modules/behavioral/behavioral.types';
import type { Competency, CompetencyAssessment, CompetencyItem, CompetenciesRepositoryContract } from '../modules/competencies/competencies.types';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'competencies-service-unit-secret';
const { CompetenciesService } = await import('../modules/competencies/competencies.service');

// The fake models durable rows, rollback and a transaction boundary; all business decisions
// below run in the real service. PostgreSQL locks/triggers have a separate real-DB suite.
class MemoryRepository implements CompetenciesRepositoryContract {
  users = new Map<string, BehavioralUser>([
    ['admin', { id: 'admin', name: 'Admin One', role: 'ADMIN', companyId: null, status: 'ACTIVE' }],
    ['admin2', { id: 'admin2', name: 'Admin Two', role: 'ADMIN', companyId: null, status: 'ACTIVE' }],
    ['employee', { id: 'employee', name: 'Subject', role: 'EMPLOYEE', companyId: 'a', status: 'ACTIVE' }],
    ['owner', { id: 'owner', name: 'Owner', role: 'OWNER', companyId: 'a', status: 'ACTIVE' }],
    ['other', { id: 'other', name: 'Other', role: 'EMPLOYEE', companyId: 'b', status: 'ACTIVE' }],
  ]);
  catalog = new Map<string, Competency>([['system', { id: 'system', companyId: null, scope: 'SYSTEM', name: 'Communication', description: 'Clear communication', category: 'General', status: 'ACTIVE', createdAt: 'old', updatedAt: 'old' }]]);
  assessments = new Map<string, CompetencyAssessment>();
  storedItems = new Map<string, CompetencyItem>();
  failCompletion = false;
  conflictOnNextCreate = false;
  private tail: Promise<unknown> = Promise.resolve();
  private locked = new Set<string>();
  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(async () => {
      const before = structuredClone([this.catalog, this.assessments, this.storedItems]);
      try { return await operation(); }
      catch (error) { [this.catalog, this.assessments, this.storedItems] = before as [typeof this.catalog, typeof this.assessments, typeof this.storedItems]; throw error; }
      finally { this.locked.clear(); }
    });
    this.tail = next.catch(() => {});
    return next;
  }
  async companyExists(id: string) { return ['a', 'b'].includes(id); }
  async findUser(id: string, _lock = false) { return structuredClone(this.users.get(id) ?? null); }
  async listCatalog(companyId: string, status?: Competency['status']) {
    return [...this.catalog.values()].filter(c => (c.scope === 'SYSTEM' || c.companyId === companyId) && (!status || c.status === status)).map(c => structuredClone(c));
  }
  async findCompetency(id: string, _lock = false) { return structuredClone(this.catalog.get(id) ?? null); }
  async createCompetency(c: Competency) { this.catalog.set(c.id, structuredClone(c)); }
  async updateCompetency(c: Competency) { this.catalog.set(c.id, structuredClone(c)); }
  async findCurrent(companyId: string, userId: string) { return structuredClone([...this.assessments.values()].find(a => a.companyId === companyId && a.subjectUserId === userId && a.status === 'IN_PROGRESS') ?? null); }
  async createAssessment(a: CompetencyAssessment) {
    if (await this.findCurrent(a.companyId, a.subjectUserId)) return false;
    if (this.conflictOnNextCreate) {
      this.conflictOnNextCreate = false;
      this.assessments.set('concurrent-winner', { ...structuredClone(a), id: 'concurrent-winner', startedByUserId: 'admin2', startedByNameSnapshot: 'Admin Two' });
      return false;
    }
    this.assessments.set(a.id, structuredClone(a)); return true;
  }
  async findAssessment(id: string, lock = false) {
    if (lock) this.locked.add(id);
    return structuredClone(this.assessments.get(id) ?? null);
  }
  async items(id: string) { return structuredClone([...this.storedItems.values()].filter(i => i.assessmentId === id)); }
  async saveItem(i: CompetencyItem) {
    assert(this.locked.has(i.assessmentId), 'save must acquire header lock');
    this.storedItems.set(`${i.assessmentId}:${i.competencyId}`, structuredClone(i));
  }
  async removeItem(id: string, competencyId: string) {
    assert(this.locked.has(id), 'remove must acquire header lock');
    this.storedItems.delete(`${id}:${competencyId}`);
  }
  async completeAssessment(a: CompetencyAssessment) {
    assert(this.locked.has(a.id), 'completion must acquire header lock');
    this.assessments.set(a.id, structuredClone(a));
    if (this.failCompletion) throw new Error('injected_completion_failure');
  }
  async listAssessments(companyId: string, filters: { userId?: string; status?: CompetencyAssessment['status'] } = {}) {
    return structuredClone([...this.assessments.values()].filter(a => a.companyId === companyId && (!filters.userId || a.subjectUserId === filters.userId) && (!filters.status || a.status === filters.status)));
  }
}
const repo = new MemoryRepository();
const service = new CompetenciesService(repo);
const auth = (userId: string, role: AuthTokenPayload['role'], companyId: string | null): AuthTokenPayload => ({ userId, role, companyId, authVersion: 1 });
const admin = auth('admin', 'ADMIN', null), admin2 = auth('admin2', 'ADMIN', null);
const rated = { evidenceStatus: 'RATED' as const, level: 4, observation: 'Concrete evidence' };
const notObserved = { evidenceStatus: 'NOT_OBSERVED' as const, level: null };

// Revisions must reject stale same-item writes, including remove/reinsert ABA.
repo.users.set('concurrency', { id: 'concurrency', name: 'Concurrent Subject', role: 'EMPLOYEE', companyId: 'a', status: 'ACTIVE' });
const concurrentDraft = await service.startOrResumeAssessment(admin, 'a', 'concurrency');
const version = (item: CompetencyItem) => `${item.id}:${item.updatedAt}`;
const x = await service.saveItem(admin, 'a', concurrentDraft.id, 'system', { ...rated, expectedVersion: null });
const realNow = Date.now;
let x2: CompetencyItem;
try {
  Date.now = () => 0; // clock rollback must not reuse or regress an item's version.
  x2 = await service.saveItem(admin2, 'a', concurrentDraft.id, 'system', { ...rated, level: 5, expectedVersion: version(x) });
} finally { Date.now = realNow; }
assert(Date.parse(x2.updatedAt) > Date.parse(x.updatedAt));
assert.notEqual(version(x2), version(x));
await assert.rejects(service.saveItem(admin, 'a', concurrentDraft.id, 'system', { ...notObserved, expectedVersion: version(x) }), /COMPETENCIES_ITEM_CONFLICT/);
await assert.rejects(service.saveItem(admin, 'a', concurrentDraft.id, 'system', { ...notObserved, expectedVersion: null }), /COMPETENCIES_ITEM_CONFLICT/);
await assert.rejects(service.saveItem(admin, 'a', concurrentDraft.id, 'system', notObserved), /COMPETENCIES_PRECONDITION_REQUIRED/);
await assert.rejects(service.removeItem(admin, 'a', concurrentDraft.id, 'system', version(x)), /COMPETENCIES_ITEM_CONFLICT/);
await service.removeItem(admin2, 'a', concurrentDraft.id, 'system', version(x2));
await assert.rejects(service.saveItem(admin, 'a', concurrentDraft.id, 'system', { ...rated, expectedVersion: version(x2) }), /COMPETENCIES_ITEM_CONFLICT/);
const replacement = await service.saveItem(admin2, 'a', concurrentDraft.id, 'system', { ...rated, expectedVersion: null });
assert.notEqual(replacement.id, x.id);
await assert.rejects(service.removeItem(admin, 'a', concurrentDraft.id, 'system', version(x2)), /COMPETENCIES_ITEM_CONFLICT/);
assert.equal((await service.getAdminAssessment(admin, 'a', concurrentDraft.id)).items[0].level, 4);

// Removing ADMIN revalidation or company scoping must expose each of these regressions.
// Legacy lifecycle cases below act on freshly read items; stale cases above never refresh.
async function saveItem(actor: AuthTokenPayload, companyId: string, assessmentId: string, competencyId: string, input: Parameters<typeof service.saveItem>[4]) {
  const current = (await repo.items(assessmentId)).find(i => i.competencyId === competencyId);
  return service.saveItem(actor, companyId, assessmentId, competencyId, { ...input, expectedVersion: current ? version(current) : null });
}
async function removeItem(actor: AuthTokenPayload, companyId: string, assessmentId: string, competencyId: string) {
  const current = (await repo.items(assessmentId)).find(i => i.competencyId === competencyId);
  return service.removeItem(actor, companyId, assessmentId, competencyId, current ? version(current) : undefined);
}
const draft = await service.startOrResumeAssessment(admin, 'a', 'employee');
for (const actor of [auth('employee', 'EMPLOYEE', 'a'), auth('owner', 'OWNER', 'a')]) {
  const attempts = [
    () => service.listCatalog(actor, 'a'), () => service.createCompanyCompetency(actor, 'a', { name: 'Private', description: 'Description' }),
    () => service.updateCompanyCompetency(actor, 'a', 'system', { name: 'Changed' }), () => service.deactivateCompanyCompetency(actor, 'a', 'system'),
    () => service.startOrResumeAssessment(actor, 'a', 'employee'), () => saveItem(actor, 'a', draft.id, 'system', rated),
    () => removeItem(actor, 'a', draft.id, 'system'), () => service.completeAssessment(actor, 'a', draft.id),
    () => service.getAdminAssessment(actor, 'a', draft.id), () => service.getHistory(actor, 'a', 'employee'),
    () => service.listCompanyAssessments(actor, 'a'),
  ];
  for (const attempt of attempts) await assert.rejects(attempt, /COMPETENCIES_ADMIN_REQUIRED/);
}
await assert.rejects(service.listCatalog({ ...admin, companyId: 'a' }, 'a'), /FORBIDDEN/);
repo.users.get('admin')!.status = 'INACTIVE';
await assert.rejects(service.listCatalog(admin, 'a'), /INACTIVE_USER/);
repo.users.get('admin')!.status = 'ACTIVE';
repo.users.get('admin')!.companyId = 'a';
await assert.rejects(service.listCatalog({ ...admin, companyId: 'a' }, 'a'), /COMPETENCIES_ADMIN_REQUIRED/);
repo.users.get('admin')!.companyId = null;
await assert.rejects(service.listCatalog(admin, 'missing'), /COMPANY_NOT_FOUND/);
await assert.rejects(service.startOrResumeAssessment(admin, 'a', 'other'), /FORBIDDEN/);
await assert.rejects(service.getAdminAssessment(admin, 'b', draft.id), /FORBIDDEN/);
await assert.rejects(service.listCatalog(admin, 'a', { status: 'BAD' as never }), /COMPETENCIES_INVALID_STATUS/);

const own = await service.createCompanyCompetency(admin, 'a', { name: ' Original ', description: 'Original description', category: 'Technical' });
const foreign = await service.createCompanyCompetency(admin, 'b', { name: 'Private B', description: 'Private description' });
assert.equal(own.scope, 'COMPANY'); assert.equal(own.companyId, 'a'); assert.equal(own.name, 'Original');
assert.deepEqual((await service.listCatalog(admin, 'a')).map(c => c.id).sort(), [own.id, 'system'].sort());
await assert.rejects(service.createCompanyCompetency(admin, 'a', { name: ' ', description: 'd' }), /COMPETENCIES_INVALID_INPUT/);
await assert.rejects(service.updateCompanyCompetency(admin, 'a', 'system', { name: 'Changed' }), /COMPETENCIES_SYSTEM_IMMUTABLE/);
await assert.rejects(service.deactivateCompanyCompetency(admin, 'a', 'system'), /COMPETENCIES_SYSTEM_IMMUTABLE/);
await assert.rejects(service.updateCompanyCompetency(admin, 'a', foreign.id, { name: 'Changed' }), /FORBIDDEN/);
await assert.rejects(saveItem(admin, 'a', draft.id, foreign.id, rated), /FORBIDDEN/);
await assert.rejects(service.completeAssessment(admin, 'a', draft.id), /COMPETENCIES_ITEMS_REQUIRED/);
assert.equal((await service.getAdminAssessment(admin, 'a', draft.id)).assessment.status, 'IN_PROGRESS');

for (const input of [
  { evidenceStatus: 'RATED', level: null }, { evidenceStatus: 'RATED', level: 0 }, { evidenceStatus: 'RATED', level: 6 },
  { evidenceStatus: 'RATED', level: 1.5 }, { evidenceStatus: 'RATED', level: '3' }, { evidenceStatus: 'NOT_OBSERVED', level: 0 },
  { evidenceStatus: 'NOT_OBSERVED', level: 3 }, { evidenceStatus: 'UNKNOWN', level: null }, { evidenceStatus: 'NOT_OBSERVED' },
  { ...rated, observation: 42 },
]) await assert.rejects(saveItem(admin, 'a', draft.id, own.id, input as never), /COMPETENCIES_INVALID_ITEM/);
for (const level of [1, 2, 3, 4, 5]) assert.equal((await saveItem(admin, 'a', draft.id, own.id, { ...rated, level })).level, level);
await service.updateCompanyCompetency(admin, 'a', own.id, { name: 'Renamed', description: 'Changed description', category: null });
await service.deactivateCompanyCompetency(admin, 'a', own.id);
const item = await saveItem(admin2, 'a', draft.id, own.id, notObserved);
assert.equal(item.competencyNameSnapshot, 'Original'); assert.equal(item.competencyDescriptionSnapshot, 'Original description');
assert.equal(item.competencyCategorySnapshot, 'Technical'); assert.equal(item.level, null); assert.equal(item.evidenceStatus, 'NOT_OBSERVED');
assert(!(await service.listCatalog(admin, 'a')).some(c => c.id === own.id));
assert((await service.listCatalog(admin, 'a', { status: 'INACTIVE' })).some(c => c.id === own.id));
await removeItem(admin, 'a', draft.id, own.id);
await assert.rejects(saveItem(admin, 'a', draft.id, own.id, rated), /COMPETENCIES_INACTIVE/);
await saveItem(admin, 'a', draft.id, 'system', notObserved);
const resumed = await service.startOrResumeAssessment(admin2, 'a', 'employee');
assert.equal(resumed.id, draft.id); assert.equal(resumed.startedByUserId, 'admin'); assert.equal(resumed.startedByNameSnapshot, 'Admin One');
repo.users.get('employee')!.name = 'Renamed Subject'; repo.users.get('admin')!.name = 'Renamed Admin';
repo.failCompletion = true;
await assert.rejects(service.completeAssessment(admin2, 'a', draft.id), /injected_completion_failure/);
assert.equal((await service.getAdminAssessment(admin, 'a', draft.id)).assessment.status, 'IN_PROGRESS');
repo.failCompletion = false;
await service.completeAssessment(admin2, 'a', draft.id);
const result = await service.getAdminAssessment(admin, 'a', draft.id);
assert.equal(result.insufficientEvidence, true); assert.equal(result.assessment.completedByUserId, 'admin2');
assert.equal(result.assessment.completedByNameSnapshot, 'Admin Two'); assert.equal(result.assessment.subjectNameSnapshot, 'Subject');
assert.equal(result.items[0].level, null); assert(!('score' in result)); assert(!('gap' in result)); assert(!('average' in result));
await assert.rejects(saveItem(admin, 'a', draft.id, 'system', rated), /COMPETENCIES_ASSESSMENT_COMPLETED/);
await assert.rejects(removeItem(admin, 'a', draft.id, 'system'), /COMPETENCIES_ASSESSMENT_COMPLETED/);
await assert.rejects(service.completeAssessment(admin, 'a', draft.id), /COMPETENCIES_ASSESSMENT_COMPLETED/);
const [next, concurrent] = await Promise.all([service.startOrResumeAssessment(admin, 'a', 'employee'), service.startOrResumeAssessment(admin2, 'a', 'employee')]);
assert.equal(next.id, concurrent.id); assert.notEqual(next.id, draft.id);
await saveItem(admin, 'a', next.id, 'system', rated);
assert.equal((await service.getAdminAssessment(admin, 'a', next.id)).insufficientEvidence, false);
// Concurrent actions must either precede completion or reject after it, never mutate history.
await Promise.all([service.completeAssessment(admin, 'a', next.id), assert.rejects(removeItem(admin2, 'a', next.id, 'system'), /COMPETENCIES_ASSESSMENT_COMPLETED/)]);
assert.equal((await service.getAdminAssessment(admin, 'a', next.id)).items[0].level, 4);
repo.users.get('employee')!.companyId = 'b';
assert.equal((await service.getHistory(admin, 'a', 'employee')).length, 2);
assert.equal((await service.getAdminAssessment(admin, 'a', draft.id)).assessment.subjectNameSnapshot, 'Subject');
await assert.rejects(service.startOrResumeAssessment(admin, 'a', 'employee'), /FORBIDDEN/);
const movedDraft = await service.startOrResumeAssessment(admin, 'b', 'employee');
repo.users.get('employee')!.companyId = 'a';
for (const action of [() => saveItem(admin, 'b', movedDraft.id, 'system', rated), () => removeItem(admin, 'b', movedDraft.id, 'system'), () => service.completeAssessment(admin, 'b', movedDraft.id)]) await assert.rejects(action, /FORBIDDEN/);
assert.equal((await service.listCompanyAssessments(admin, 'a', { status: 'COMPLETED' })).length, 2);
await assert.rejects(service.getHistory(admin, 'a', ''), /COMPETENCIES_INVALID_USER/);
await assert.rejects(service.listCompanyAssessments(admin, 'a', { userId: '' }), /COMPETENCIES_INVALID_USER/);
await assert.rejects(service.listCompanyAssessments(admin, 'a', { status: 'INVALID' as never }), /COMPETENCIES_INVALID_STATUS/);
await assert.rejects(service.updateCompanyCompetency(admin, 'a', own.id, { companyId: 'b' } as never), /COMPETENCIES_INVALID_INPUT/);
await assert.rejects(service.createCompanyCompetency(admin, 'a', { name: 'Injected', description: 'd', scope: 'SYSTEM' } as never), /COMPETENCIES_INVALID_INPUT/);
repo.conflictOnNextCreate = true;
const winner = await service.startOrResumeAssessment(admin, 'a', 'owner');
assert.equal(winner.id, 'concurrent-winner'); assert.equal(winner.startedByUserId, 'admin2');
console.log('Competencies service unit tests passed: ADMIN, isolation, evidence, snapshots, rollback, locks, history and concurrent lifecycle');
