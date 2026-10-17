export type { Plan, ActionPlanTaskDetails as Task, Evidence, History } from '../../../../api/src/modules/action-plan/action-plan.types';
export interface Session {
  token: string;
  user: { id: string; name: string; role: 'ADMIN' | 'OWNER' | 'EMPLOYEE'; companyId: string | null };
}
export interface Member { id: string; name: string; role: string }
export interface Metrics { total: number; pending: number; inProgress: number; awaitingValidation: number; completed: number; canceled: number; overdue: number; progress: number }
export interface Employee extends Metrics { id: string; name: string }
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.', INVALID_PROGRESS: 'Informe um progresso inteiro de 0 a 100.',
  INVALID_RESPONSIBLE: 'Escolha um responsável ativo desta empresa.', INVALID_DATE_RANGE: 'O prazo deve ser posterior ao início.',
  INVALID_LINK: 'Informe um link HTTP ou HTTPS sem credenciais.', FORBIDDEN: 'Você não tem permissão para esta ação.',
  PLAN_HAS_UNFINISHED_TASKS: 'Conclua as tarefas antes de concluir o plano.', PLAN_CLOSED: 'Este plano está encerrado.',
  INACTIVE_USER: 'Usuário inativo. Entre novamente ou contate a gestão.',
};
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function api(session: Session, companyId: string) {
  return async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    const url = new URL('/api' + path, window.location.origin);
    if (companyId) url.searchParams.set('companyId', companyId);
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: body === undefined ? undefined : JSON.stringify(body), signal });
    const data = await response.json();
    if (!response.ok) throw new ApiError(response.status, messages[data.error] ?? (response.status === 401 ? 'Sessão expirada. Entre novamente.' : response.status === 404 ? 'Registro indisponível.' : 'Não foi possível salvar ou carregar os dados. Verifique os campos e tente novamente.'));
    return data as T;
  };
}
export const statuses = ['PENDENTE','EM_ANDAMENTO','AGUARDANDO_VALIDACAO','CONCLUIDA','CANCELADA'] as const;
export const priorities = ['BAIXA','MEDIA','ALTA','CRITICA'] as const;
export const planStates = ['RASCUNHO','ATIVO','CONCLUIDO','CANCELADO'] as const;
export const label = (value: string) => ({ PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em andamento', AGUARDANDO_VALIDACAO: 'Aguardando validação', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada', BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica', RASCUNHO: 'Rascunho', ATIVO: 'Ativo', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado', CRIACAO: 'Criação', RESPONSAVEL: 'Responsável', PRAZO: 'Prazo', PRIORIDADE: 'Prioridade', STATUS: 'Status', PROGRESSO: 'Progresso', EVIDENCIA_ADICIONADA: 'Evidência adicionada', CONCLUSAO: 'Conclusão', REABERTURA: 'Reabertura', EDICAO: 'Edição', MIGRACAO: 'Migração' })[value] ?? value;
export const shortDate = (value: string | null) => value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem prazo';
