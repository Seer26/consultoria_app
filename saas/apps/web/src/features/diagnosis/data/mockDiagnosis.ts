import type { DashboardAlert, DashboardTask, DiagnosisArea, DiagnosisQuestion } from '../types';

export const diagnosisAreas: DiagnosisArea[] = [
  {
    key: 'strategy',
    label: 'Estrategia',
    description: 'Direcionamento, metas e posicionamento competitivo.',
  },
  {
    key: 'people',
    label: 'Pessoas',
    description: 'Lideranca, papeis, cultura e desenvolvimento da equipe.',
  },
  {
    key: 'processes',
    label: 'Processos',
    description: 'Padronizacao, produtividade, rotina e qualidade operacional.',
  },
  {
    key: 'marketing_sales',
    label: 'Marketing',
    description: 'Aquisicao, conversao, relacionamento e expansao comercial.',
  },
  {
    key: 'financial',
    label: 'Financeiro',
    description: 'Controle, margem, caixa e planejamento financeiro.',
  },
];

export const diagnosisQuestions: DiagnosisQuestion[] = [
  {
    id: 'strategy-01',
    area: 'strategy',
    title: 'A empresa possui metas claras para os proximos 12 meses?',
    helperText: 'Avalie se os objetivos sao conhecidos e acompanhados pela lideranca.',
  },
  {
    id: 'strategy-02',
    area: 'strategy',
    title: 'Existe acompanhamento frequente dos indicadores estrategicos?',
    helperText: 'Considere receita, margem, crescimento e metas prioritarias.',
  },
  {
    id: 'strategy-03',
    area: 'strategy',
    title: 'O posicionamento da empresa no mercado esta bem definido?',
    helperText: 'Avalie publico-alvo, diferenciais e proposta de valor.',
  },
  {
    id: 'strategy-04',
    area: 'strategy',
    title: 'As decisoes da empresa seguem prioridades estrategicas claras?',
    helperText: 'Considere foco, coerencia de investimentos e alocacao de energia.',
  },
  {
    id: 'strategy-05',
    area: 'strategy',
    title: 'Existe revisao estruturada da estrategia ao longo do ano?',
    helperText: 'Avalie ritos de planejamento e ajustes de rota.',
  },
  {
    id: 'people-01',
    area: 'people',
    title: 'As responsabilidades da equipe estao bem definidas?',
    helperText: 'Considere papeis, ownership e clareza de decisao.',
  },
  {
    id: 'people-02',
    area: 'people',
    title: 'Os lideres realizam feedbacks com frequencia?',
    helperText: 'Avalie rotinas de alinhamento e desenvolvimento.',
  },
  {
    id: 'people-03',
    area: 'people',
    title: 'A empresa tem um processo consistente de contratacao e onboarding?',
    helperText: 'Considere integracao, treinamento e expectativa de performance.',
  },
  {
    id: 'people-04',
    area: 'people',
    title: 'Existe desenvolvimento continuo das competencias da equipe?',
    helperText: 'Avalie treinamentos e crescimento tecnico/comportamental.',
  },
  {
    id: 'people-05',
    area: 'people',
    title: 'O clima e engajamento da equipe sao monitorados?',
    helperText: 'Considere percepcao de ambiente, retencao e colaboracao.',
  },
  {
    id: 'processes-01',
    area: 'processes',
    title: 'Os processos principais estao documentados?',
    helperText: 'Considere vendas, atendimento, operacao e entrega.',
  },
  {
    id: 'processes-02',
    area: 'processes',
    title: 'A operacao possui controles para evitar retrabalho?',
    helperText: 'Avalie checklists, pontos de validacao e padroes de qualidade.',
  },
  {
    id: 'processes-03',
    area: 'processes',
    title: 'Os prazos de entrega sao previsiveis?',
    helperText: 'Considere lead time, gargalos e capacidade operacional.',
  },
  {
    id: 'processes-04',
    area: 'processes',
    title: 'A empresa mede produtividade e eficiencia operacional?',
    helperText: 'Avalie indicadores e acompanhamento gerencial da execucao.',
  },
  {
    id: 'processes-05',
    area: 'processes',
    title: 'As ferramentas atuais apoiam bem a execucao dos processos?',
    helperText: 'Considere uso de sistemas, automacoes e integracoes.',
  },
  {
    id: 'marketing-01',
    area: 'marketing_sales',
    title: 'A empresa possui canais consistentes de geracao de demanda?',
    helperText: 'Considere inbound, outbound, parcerias e indicacoes.',
  },
  {
    id: 'marketing-02',
    area: 'marketing_sales',
    title: 'Existe previsibilidade no funil comercial?',
    helperText: 'Avalie etapas, conversao e acompanhamento de oportunidades.',
  },
  {
    id: 'marketing-03',
    area: 'marketing_sales',
    title: 'A proposta comercial esta bem estruturada?',
    helperText: 'Considere argumentacao, precificacao e clareza de oferta.',
  },
  {
    id: 'marketing-04',
    area: 'marketing_sales',
    title: 'A empresa monitora retencao, recompra ou expansao de clientes?',
    helperText: 'Avalie pos-venda, fidelizacao e crescimento da base.',
  },
  {
    id: 'marketing-05',
    area: 'marketing_sales',
    title: 'Os investimentos em marketing sao medidos por resultado?',
    helperText: 'Considere CAC, ROI e origem das vendas.',
  },
  {
    id: 'financial-01',
    area: 'financial',
    title: 'A empresa possui controle confiavel de fluxo de caixa?',
    helperText: 'Considere entradas, saidas e previsao financeira.',
  },
  {
    id: 'financial-02',
    area: 'financial',
    title: 'A margem de lucro por produto ou servico e conhecida?',
    helperText: 'Avalie precificacao, custo e rentabilidade.',
  },
  {
    id: 'financial-03',
    area: 'financial',
    title: 'Existe planejamento financeiro e orcamentario?',
    helperText: 'Considere metas, despesas e capital de giro.',
  },
  {
    id: 'financial-04',
    area: 'financial',
    title: 'As contas a pagar e receber sao geridas com disciplina?',
    helperText: 'Avalie inadimplencia, previsibilidade e rotina de fechamento.',
  },
  {
    id: 'financial-05',
    area: 'financial',
    title: 'A empresa usa relatorios financeiros para tomar decisao?',
    helperText: 'Considere DRE, caixa, margem e comparativos.',
  },
];

export const mockPriorityTasks: DashboardTask[] = [
  { id: 'task-01', title: 'Estruturar fluxo de caixa semanal', area: 'Financeiro', priority: 'Alta' },
  { id: 'task-02', title: 'Documentar processo comercial', area: 'Marketing', priority: 'Alta' },
  { id: 'task-03', title: 'Definir metas trimestrais da empresa', area: 'Estrategia', priority: 'Media' },
];

export const mockAlerts: DashboardAlert[] = [
  { id: 'alert-01', title: 'Financeiro com baixa maturidade', description: 'Area com maior risco para crescimento sustentavel.' },
  { id: 'alert-02', title: 'Processos sem padronizacao forte', description: 'A operacao tende a escalar com retrabalho.' },
];
