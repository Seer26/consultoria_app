import type { BehavioralUser } from '../behavioral/behavioral.types';

export type EvidenceStatus = 'NOT_OBSERVED' | 'RATED';
export type CompetencyScope = 'SYSTEM' | 'COMPANY';
export type CompetencyStatus = 'ACTIVE' | 'INACTIVE';
export type CompetencyAssessmentStatus = 'IN_PROGRESS' | 'COMPLETED';
export interface Competency {
  id: string;
  companyId: string | null;
  scope: CompetencyScope;
  name: string;
  description: string;
  category: string | null;
  status: CompetencyStatus;
  createdAt: string;
  updatedAt: string;
}
export interface CreateCompanyCompetencyInput { name: string; description: string; category?: string | null }
export type UpdateCompanyCompetencyInput = Partial<CreateCompanyCompetencyInput>;
export interface CompetencyCatalogFilters { status?: CompetencyStatus }
export interface CompetencyAssessmentFilters { userId?: string; status?: CompetencyAssessmentStatus }
export interface SaveCompetencyItemInput {
  /** null means create only; existing items require their observed id:updatedAt. */
  expectedVersion?: string | null;
  evidenceStatus: EvidenceStatus;
  level: number | null;
  observation?: string | null;
}
export interface CompetencyAssessment {
  id: string;
  companyId: string;
  subjectUserId: string;
  startedByUserId: string;
  completedByUserId: string | null;
  subjectNameSnapshot: string;
  startedByNameSnapshot: string;
  completedByNameSnapshot: string | null;
  status: CompetencyAssessmentStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}
export interface CompetencyItem {
  id: string;
  assessmentId: string;
  competencyId: string;
  competencyNameSnapshot: string;
  competencyDescriptionSnapshot: string;
  competencyCategorySnapshot: string | null;
  competencyScopeSnapshot: CompetencyScope;
  evidenceStatus: EvidenceStatus;
  level: number | null;
  observation: string | null;
  createdAt: string;
  updatedAt: string;
}
// Technical DTO exclusively for ADMIN; no consolidated score, average or gap in V1.
export interface AdminCompetencyAssessmentDto {
  assessment: CompetencyAssessment;
  items: CompetencyItem[];
  insufficientEvidence: boolean;
}
export interface CompetenciesRepositoryContract {
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  companyExists(id: string): Promise<boolean>;
  findUser(id: string, lock?: boolean): Promise<BehavioralUser | null>;
  listCatalog(companyId: string, status?: CompetencyStatus): Promise<Competency[]>;
  findCompetency(id: string, lock?: boolean): Promise<Competency | null>;
  createCompetency(input: Competency): Promise<void>;
  updateCompetency(input: Competency): Promise<void>;
  findCurrent(companyId: string, userId: string): Promise<CompetencyAssessment | null>;
  createAssessment(input: CompetencyAssessment): Promise<boolean>;
  findAssessment(id: string, lock?: boolean): Promise<CompetencyAssessment | null>;
  items(assessmentId: string): Promise<CompetencyItem[]>;
  saveItem(input: CompetencyItem): Promise<void>;
  removeItem(assessmentId: string, competencyId: string): Promise<void>;
  completeAssessment(input: CompetencyAssessment): Promise<void>;
  listAssessments(companyId: string, filters?: CompetencyAssessmentFilters): Promise<CompetencyAssessment[]>;
}
