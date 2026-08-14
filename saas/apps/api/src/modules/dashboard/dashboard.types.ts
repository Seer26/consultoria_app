export interface DashboardMetrics {
  companiesTotal?: number;
  usersTotal?: number;
  researchTotal: number;
  completedResearchTotal: number;
  averageScore: number | null;
  openTasks: number;
  inProgressTasks?: number;
  overdueTasks: number;
  criticalOverdueTasks: number;
  dueSoonTasks: number;
  doneTasks: number;
  assignedTasksTotal?: number;
  usersCompanyTotal?: number;
  myResearchTotal?: number;
}

export interface DashboardPillarScore {
  pillar: string;
  score: number;
  answersCount?: number;
  maturity?: string;
}

export interface DashboardResearchItem {
  id: string;
  companyId: string;
  companyName: string | null;
  userId: string | null;
  userName: string | null;
  respondentRole: string | null;
  department: string | null;
  status: string;
  overallScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DashboardTaskItem {
  id: string;
  companyId: string;
  companyName: string | null;
  submissionId: string | null;
  title: string;
  pillar: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  source: string;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  daysOverdue?: number;
  isDueSoon?: boolean;
}

export interface DashboardCompanyScoreItem {
  companyId: string;
  companyName: string;
  averageScore: number | null;
  completedResearchTotal: number;
  usersTotal: number;
}

export interface DashboardCompanySummary {
  id: string;
  name: string;
  averageScore: number | null;
  openTasks: number;
  overdueTasks: number;
}

export interface DashboardOnboardingProgress {
  completedCount: number;
  totalCount: number;
  progress: number;
  isComplete: boolean;
  items: {
    companyProfile: boolean;
    team: boolean;
    professionalProfiles: boolean;
    firstResearch: boolean;
    firstResult: boolean;
    firstActionPlan: boolean;
  };
}
