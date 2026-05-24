import type { AuthTokenPayload, UserRole } from '../auth/auth.types';

export type ResearchSubmissionStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface ResearchPillarScore {
  pillar: string;
  score: number;
  answersCount: number;
  maturity: 'critical' | 'attention' | 'intermediate' | 'good';
}

export interface ResearchResultSnapshot {
  overallScore: number | null;
  summary: string | null;
  criticalPoints: string[];
  opportunities: string[];
  recommendations: string[];
  nextSteps: string[];
  pillarScores: ResearchPillarScore[];
}

export interface ResearchSubmissionRecord extends ResearchResultSnapshot {
  id: string;
  companyId: string;
  userId: string;
  questionnaireId: string;
  submissionType: 'RESEARCH';
  respondentRole: string;
  department: string;
  status: ResearchSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ResearchAnswerRecord {
  id: string;
  submissionId: string;
  questionId: string;
  question: string;
  answer: string;
  pillar: string | null;
  value: number | null;
  score: number | null;
  createdAt: string;
}

export interface CreateResearchSubmissionInput {
  companyId?: string;
  userId?: string;
  respondentRole: string;
  department: string;
}

export interface CreateResearchAnswerInput {
  question: string;
  answer: string;
  pillar?: string | null;
  score?: number | null;
}

export interface CompleteResearchSubmissionInput {
  summary?: string | null;
}

export interface AuthenticatedUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ResearchSubmissionDetails {
  id: string;
  status: ResearchSubmissionStatus;
  overallScore: number | null;
  summary: string | null;
  criticalPoints: string[];
  opportunities: string[];
  recommendations: string[];
  nextSteps: string[];
  pillarScores: ResearchPillarScore[];
  respondentRole: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  company: CompanyRecord | null;
  user: Pick<AuthenticatedUserRecord, 'id' | 'name' | 'email' | 'role' | 'companyId' | 'status'> | null;
  answers: ResearchAnswerRecord[];
}

export interface ResearchListFilters {
  companyId?: string;
}

export interface ResearchListItem extends ResearchResultSnapshot {
  id: string;
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  respondentRole: string;
  department: string;
  status: ResearchSubmissionStatus;
  answersCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ResearchAccessContext {
  auth: AuthTokenPayload;
  actor: AuthenticatedUserRecord;
}
