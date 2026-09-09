import type { AuthTokenPayload, UserRole } from '../auth/auth.types';

export type ActionPlanTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ActionPlanTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
export type ActionPlanTaskSource = 'RESEARCH_RECOMMENDATION' | 'MANUAL' | 'AI';
export type ActionPlanVersionStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type ActionPlanVersionSource = 'AI' | 'MANUAL';

export interface ActionPlanVersionRecord {
  id: string;
  companyId: string;
  submissionId: string;
  versionNumber: number;
  status: ActionPlanVersionStatus;
  source: ActionPlanVersionSource;
  generatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ActionPlanVersionSummary extends ActionPlanVersionRecord {
  generatedByUserName: string | null;
  tasksCount: number;
}

export interface ActionPlanTaskRecord {
  id: string;
  companyId: string;
  submissionId: string | null;
  planVersionId: string | null;
  title: string;
  description: string;
  pillar: string | null;
  priority: ActionPlanTaskPriority;
  status: ActionPlanTaskStatus;
  dueDate: string | null;
  responsibleUserId: string | null;
  source: ActionPlanTaskSource;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ActionPlanTaskDetails extends ActionPlanTaskRecord {
  companyName: string | null;
  responsibleUserName: string | null;
  responsibleUserEmail: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  isDueSoon: boolean;
}

export type ActionPlanTaskScope =
  | 'all'
  | 'mine'
  | 'overdue'
  | 'dueSoon'
  | 'critical'
  | 'completed';

export interface ActionPlanAssignee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jobRole: string;
  department: string;
  companyId: string;
}

export interface CreateActionPlanTaskInput {
  companyId?: string;
  submissionId?: string | null;
  planVersionId?: string | null;
  title: string;
  description?: string;
  pillar?: string | null;
  priority?: ActionPlanTaskPriority;
  status?: ActionPlanTaskStatus;
  dueDate?: string | null;
  responsibleUserId?: string | null;
  source?: ActionPlanTaskSource;
}

export interface UpdateActionPlanTaskInput {
  title?: string;
  description?: string;
  pillar?: string | null;
  priority?: ActionPlanTaskPriority;
  status?: ActionPlanTaskStatus;
  dueDate?: string | null;
  responsibleUserId?: string | null;
}

export interface UpdateActionPlanTaskStatusInput {
  status: ActionPlanTaskStatus;
}

export interface ActionPlanListFilters {
  companyId?: string;
  submissionId?: string;
  planVersionId?: string;
  scope?: ActionPlanTaskScope;
  search?: string;
}

export interface AuthenticatedActionPlanUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ActionPlanCompanyRecord {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ActionPlanGenerationResult {
  submissionId: string;
  companyId: string;
  alreadyGenerated: boolean;
  planVersion: ActionPlanVersionSummary;
  createdCount: number;
  tasks: ActionPlanTaskDetails[];
}

export interface ActionPlanAccessContext {
  auth: AuthTokenPayload;
  actor: AuthenticatedActionPlanUser;
}
