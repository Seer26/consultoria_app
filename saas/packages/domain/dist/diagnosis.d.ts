import type { PillarKey } from './pillars';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'done';
export interface Company {
    id: string;
    name: string;
    sector?: string;
    size?: string;
}
export interface DiagnosisQuestionOption {
    value: number;
    label: string;
}
export interface DiagnosisQuestion {
    id: string;
    pillar: PillarKey;
    title: string;
    description: string;
    weight: number;
    options: DiagnosisQuestionOption[];
}
export interface DiagnosisQuestionnaire {
    id: string;
    name: string;
    pillars: {
        key: PillarKey;
        label: string;
    }[];
    questions: DiagnosisQuestion[];
}
export interface DiagnosisAnswerInput {
    questionId: string;
    value: number;
}
export interface DiagnosisSubmissionInput {
    company: Omit<Company, 'id'>;
    answers: DiagnosisAnswerInput[];
}
export interface PillarScore {
    pillar: PillarKey;
    label: string;
    score: number;
    maxScore: number;
    percentage: number;
    maturityLevel: DiagnosisMaturityLevel;
    averageAnswer: number;
}
export interface DiagnosisInsight {
    pillar: PillarKey;
    label: string;
    percentage: number;
    maturityLevel: DiagnosisMaturityLevel;
    summary: string;
}
export type DiagnosisMaturityLevel = 'critical' | 'attention' | 'structured' | 'optimized';
export interface DiagnosisQuestionAnalysis {
    questionId: string;
    pillar: PillarKey;
    title: string;
    answerValue: number;
    weight: number;
    weightedScore: number;
    maxWeightedScore: number;
    gap: number;
}
export interface DiagnosisExecutiveSummary {
    overallPercentage: number;
    maturityLevel: DiagnosisMaturityLevel;
    primaryBottleneck?: DiagnosisInsight;
    mainStrength?: DiagnosisInsight;
    summary: string;
}
export interface ActionTask {
    id: string;
    pillar: PillarKey;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
}
export interface DiagnosisResult {
    submissionId: string;
    company: Company;
    executiveSummary: DiagnosisExecutiveSummary;
    scores: PillarScore[];
    strengths: DiagnosisInsight[];
    weaknesses: DiagnosisInsight[];
    questionAnalysis: DiagnosisQuestionAnalysis[];
    actionPlan: ActionTask[];
}
