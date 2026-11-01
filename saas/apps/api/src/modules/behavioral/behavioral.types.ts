import type { UserRole } from '../auth/auth.types';

export type BehavioralDimension = 'EXECUTOR' | 'COMUNICADOR' | 'PLANEJADOR' | 'ANALITICO';
export type BehavioralStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface BehavioralQuestion {
  id: string;
  questionnaireVersion: number;
  dimension: BehavioralDimension;
  text: string;
  isReverse: boolean;
  position: number;
  active: boolean;
}

export interface BehavioralAnswer {
  id: string;
  assessmentId: string;
  questionId: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface BehavioralResult {
  executorScore: number;
  comunicadorScore: number;
  planejadorScore: number;
  analiticoScore: number;
  predominantDimension: BehavioralDimension | null;
}

export interface BehavioralStoredResult extends BehavioralResult {
  assessmentId: string;
  calculatedAt: string;
}

export interface BehavioralAssessment {
  id: string;
  companyId: string;
  userId: string;
  status: BehavioralStatus;
  questionnaireVersion: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface BehavioralAssessmentSummary extends BehavioralAssessment {
  answeredCount: number;
  totalQuestions: number;
}

export interface BehavioralListItem extends BehavioralAssessmentSummary {
  userName: string;
  userRole: UserRole;
}

export interface BehavioralListFilters {
  userId?: string;
  status?: BehavioralStatus;
}

export interface BehavioralUser {
  id: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}
