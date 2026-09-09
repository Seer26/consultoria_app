import type { AuthTokenPayload, UserRole } from '../auth/auth.types';
import type { DiagnosisScoreInterpretation } from './score-interpretation';

export type ResearchSubmissionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type DiagnosisReviewStatus = 'AGUARDANDO_REVISAO' | 'APROVADO' | 'PUBLICADO';

export interface ResearchPillarScore {
  pillar: string;
  score: number;
  answersCount: number;
  maturity: 'critical' | 'attention' | 'intermediate' | 'good';
  scoreInterpretation?: DiagnosisScoreInterpretation | null;
}

export type AiRecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AiConsultingRecommendation {
  title: string;
  description: string;
  priority: AiRecommendationPriority;
  pillar: string;
}

export interface AiConsultingAnalysis {
  executiveSummary: string;
  strengths: string[];
  attentionPoints: string[];
  recommendations: AiConsultingRecommendation[];
  generatedAt: string;
}

export interface ResearchResultSnapshot {
  overallScore: number | null;
  scoreInterpretation?: DiagnosisScoreInterpretation | null;
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
  respondentDepartment: string;
  respondentJobFunction: string;
  status: ResearchSubmissionStatus;
  diagnosisStatus: DiagnosisReviewStatus;
  approvedByUserId: string | null;
  approvedAt: string | null;
  publishedByUserId: string | null;
  publishedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  aiAnalysis: AiConsultingAnalysis | null;
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
  respondentRole?: string;
  department?: string;
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
  department: string | null;
  jobFunction: string | null;
}

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  sector: string | null;
  size: string | null;
}

export interface ResearchSubmissionDetails {
  id: string;
  status: ResearchSubmissionStatus;
  diagnosisStatus?: DiagnosisReviewStatus;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  publishedByUserId?: string | null;
  publishedAt?: string | null;
  reviewNotes?: string | null;
  overallScore?: number | null;
  scoreInterpretation?: DiagnosisScoreInterpretation | null;
  summary?: string | null;
  criticalPoints?: string[];
  opportunities?: string[];
  recommendations?: string[];
  nextSteps?: string[];
  pillarScores?: ResearchPillarScore[];
  respondentRole: string;
  department: string;
  respondentDepartment: string;
  respondentJobFunction: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  company: CompanyRecord | null;
  user: Pick<AuthenticatedUserRecord, 'id' | 'name' | 'email' | 'role' | 'companyId' | 'status'> | null;
  answers: ResearchAnswerRecord[];
  aiAnalysis?: AiConsultingAnalysis | null;
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
  respondentDepartment: string;
  respondentJobFunction: string;
  status: ResearchSubmissionStatus;
  diagnosisStatus: DiagnosisReviewStatus;
  approvedByUserId: string | null;
  approvedAt: string | null;
  publishedByUserId: string | null;
  publishedAt: string | null;
  reviewNotes: string | null;
  answersCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ResearchAccessContext {
  auth: AuthTokenPayload;
  actor: AuthenticatedUserRecord;
}

export interface ReviewResearchDiagnosisInput {
  summary?: string | null;
  criticalPoints?: string[];
  opportunities?: string[];
  recommendations?: string[];
  nextSteps?: string[];
  aiAnalysis?: AiConsultingAnalysis | null;
  reviewNotes?: string | null;
}
