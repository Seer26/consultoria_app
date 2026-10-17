import type { UserRole } from '../auth/auth.types';

export const planStatuses = ['RASCUNHO', 'ATIVO', 'CONCLUIDO', 'CANCELADO'] as const;
export const taskStatuses = ['PENDENTE', 'EM_ANDAMENTO', 'AGUARDANDO_VALIDACAO', 'CONCLUIDA', 'CANCELADA'] as const;
export const taskPriorities = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
export type PlanStatus = typeof planStatuses[number];
export type ActionPlanTaskStatus = typeof taskStatuses[number];
export type ActionPlanTaskPriority = typeof taskPriorities[number];
export type ActionPlanTaskSource = 'RESEARCH_RECOMMENDATION' | 'MANUAL' | 'AI';
export interface Actor { id: string; name: string; role: UserRole; companyId: string | null; status: string }
export interface Scope { actor: Actor; companyId: string; employeeId?: string }
export interface Plan {
  id: string; companyId: string; submissionId: string | null; title: string; description: string;
  status: PlanStatus; startDate: string | null; dueDate: string | null;
  createdBy: string | null; createdAt: string; updatedAt: string; progress: number;
}
export interface TaskRecord {
  id: string; companyId: string; planId: string; submissionId: string | null;
  title: string; description: string; pillar: string | null;
  priority: ActionPlanTaskPriority; status: ActionPlanTaskStatus;
  startDate: string | null; dueDate: string | null; responsibleUserId: string | null;
  progress: number; notes: string; source: ActionPlanTaskSource;
  createdAt: string; updatedAt: string; completedAt: string | null;
}
export interface ActionPlanTaskDetails extends TaskRecord {
  responsibleUserName: string | null; companyName: string; overdue: boolean;
}
export type HistoryEvent = 'CRIACAO' | 'RESPONSAVEL' | 'PRAZO' | 'PRIORIDADE' | 'STATUS' | 'PROGRESSO' | 'EVIDENCIA_ADICIONADA' | 'CONCLUSAO' | 'REABERTURA' | 'EDICAO';
export interface History {
  id: string; taskId: string; companyId: string; event: HistoryEvent;
  actorId: string; actorName: string; oldValue: unknown; newValue: unknown; createdAt: string;
}
export interface Evidence {
  id: string; taskId: string; companyId: string; type: 'COMENTARIO' | 'LINK';
  content: string; createdBy: string; createdAt: string; actorName?: string;
}
export interface TaskFilters {
  planId?: string; submissionId?: string; status?: string; responsibleUserId?: string;
  priority?: string; overdue?: boolean; completed?: boolean;
}
export interface ActionPlanGenerationResult {
  submissionId: string; companyId: string; planId: string; alreadyGenerated: boolean;
  createdCount: number; tasks: ActionPlanTaskDetails[];
}
