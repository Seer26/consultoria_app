import type { UserRole } from '../auth/auth.types';

export type ReportMaturityLevel = 'CRITICAL' | 'INITIAL' | 'INTERMEDIATE' | 'ADVANCED';

export interface ReportActor {
  id: string;
  role: UserRole;
  companyId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ReportCompanyInfo {
  companyId: string;
  companyName: string;
  companyStatus: string;
}

export interface ReportResearchInfo {
  submissionId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentRole: string | null;
  department: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  overallScore: number | null;
  maturityLevel: ReportMaturityLevel | null;
  maturityLabel: string | null;
}

export interface ReportPillarScore {
  pillar: string;
  score: number;
  answersCount?: number;
  maturity?: string;
}

export interface ReportTask {
  id: string;
  title: string;
  description: string;
  pillar: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  responsibleUserName: string | null;
  responsibleUserEmail: string | null;
  source: string;
}

export interface ExecutiveReport {
  company: ReportCompanyInfo;
  research: ReportResearchInfo;
  result: {
    summary: string | null;
    pillarScores: ReportPillarScore[];
    criticalPoints: string[];
    opportunities: string[];
    recommendations: string[];
    nextSteps: string[];
  };
  actionPlan: {
    actionPlanGenerated: boolean;
    tasksTotal: number;
    tasksTodo: number;
    tasksInProgress: number;
    tasksDone: number;
    tasksCanceled: number;
    tasksOverdue: number;
    tasks: ReportTask[];
  };
}

export interface ReportSummary {
  submissionId: string;
  companyId: string;
  companyName: string;
  respondentName: string | null;
  respondentRole: string | null;
  department: string | null;
  completedAt: string | null;
  overallScore: number | null;
  maturityLevel: ReportMaturityLevel | null;
  maturityLabel: string | null;
  actionPlanGenerated: boolean;
}

export interface ExecutiveReportPdfFile {
  filename: string;
  buffer: Buffer;
}
