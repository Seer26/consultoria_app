export class DashboardService {
    getAdminOverview(auth) {
        return {
            user: {
                userId: auth.userId,
                role: auth.role,
            },
            totals: {
                companies: 12,
                diagnoses: 37,
                alerts: 4,
            },
            companies: [
                {
                    id: 'company-001',
                    name: 'Grupo Atlas',
                    score: 78,
                    diagnoses: 4,
                    users: 3,
                },
                {
                    id: 'company-002',
                    name: 'Nova Gestao',
                    score: 64,
                    diagnoses: 2,
                    users: 5,
                },
                {
                    id: 'company-003',
                    name: 'Varejo Prime',
                    score: 81,
                    diagnoses: 6,
                    users: 4,
                },
            ],
            alerts: [
                '2 empresas estao com diagnostico atrasado nesta semana.',
                'Financeiro aparece como principal gargalo em 3 contas.',
                '1 owner ainda nao ativou a equipe no sistema.',
            ],
            overview: {
                summary: 'Visao consolidada da consultoria com empresas, diagnosticos e alertas operacionais.',
            },
        };
    }
    getCompanyDashboard(auth) {
        return {
            user: {
                userId: auth.userId,
                role: auth.role,
                companyId: auth.companyId,
            },
            company: {
                id: auth.companyId,
                name: 'Empresa Demo',
                score: 72,
                progress: 68,
            },
            problems: [
                'Financeiro com baixa previsibilidade de caixa.',
                'Processos comerciais com pouca padronizacao.',
                'Equipe sem rotina consistente de acompanhamento.',
            ],
            actions: [
                'Implementar rotina semanal de fluxo de caixa.',
                'Padronizar funil comercial e handoff entre etapas.',
                'Criar reuniao quinzenal de performance da equipe.',
            ],
            metrics: {
                answeredQuestions: 17,
                totalQuestions: 25,
            },
        };
    }
    getEmployeeDashboard(auth) {
        return {
            user: {
                userId: auth.userId,
                role: auth.role,
                companyId: auth.companyId,
            },
            tasks: [
                {
                    id: 'task-001',
                    title: 'Responder diagnostico financeiro',
                    status: 'pending',
                    priority: 'high',
                },
                {
                    id: 'task-002',
                    title: 'Atualizar evidencias do processo comercial',
                    status: 'in_progress',
                    priority: 'medium',
                },
                {
                    id: 'task-003',
                    title: 'Concluir checklist operacional da semana',
                    status: 'pending',
                    priority: 'medium',
                },
            ],
            progress: {
                personalProgress: 68,
                pendingDiagnosis: 2,
            },
            diagnosis: {
                pendingItems: [
                    'Diagnostico de Processos aguardando resposta.',
                    'Revisao de Pessoas com 2 perguntas pendentes.',
                ],
            },
        };
    }
}
