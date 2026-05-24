import '../../domain/entities/business_area.dart';
import '../../domain/entities/diagnosis_scale_question.dart';
import '../state/diagnosis_workspace_state.dart';

const diagnosisWorkspaceQuestions = <DiagnosisScaleQuestion>[
  DiagnosisScaleQuestion(
    id: 'strategy_01',
    area: BusinessArea.strategy,
    title: 'A empresa possui metas claras para os proximos 12 meses?',
    helper: 'Considere clareza, comunicacao e acompanhamento pela lideranca.',
  ),
  DiagnosisScaleQuestion(
    id: 'strategy_02',
    area: BusinessArea.strategy,
    title: 'Os indicadores estrategicos sao revisados com frequencia?',
    helper: 'Avalie receita, margem, produtividade e crescimento.',
  ),
  DiagnosisScaleQuestion(
    id: 'strategy_03',
    area: BusinessArea.strategy,
    title: 'O posicionamento no mercado esta bem definido?',
    helper: 'Considere publico-alvo, proposta de valor e diferenciais.',
  ),
  DiagnosisScaleQuestion(
    id: 'strategy_04',
    area: BusinessArea.strategy,
    title: 'As prioridades da empresa orientam as principais decisoes?',
    helper: 'Avalie coerencia entre objetivos, investimentos e agenda.',
  ),
  DiagnosisScaleQuestion(
    id: 'strategy_05',
    area: BusinessArea.strategy,
    title: 'A estrategia e revisada ao longo do ano?',
    helper: 'Considere ritos de revisao e capacidade de ajuste de rota.',
  ),
  DiagnosisScaleQuestion(
    id: 'people_01',
    area: BusinessArea.people,
    title: 'Os papeis e responsabilidades da equipe estao claros?',
    helper: 'Considere ownership, autonomia e pontos de decisao.',
  ),
  DiagnosisScaleQuestion(
    id: 'people_02',
    area: BusinessArea.people,
    title: 'Existe rotina de feedback e acompanhamento?',
    helper: 'Avalie alinhamentos, gestao de desempenho e desenvolvimento.',
  ),
  DiagnosisScaleQuestion(
    id: 'people_03',
    area: BusinessArea.people,
    title: 'O processo de onboarding prepara bem novos colaboradores?',
    helper: 'Considere treinamentos, metas iniciais e integracao.',
  ),
  DiagnosisScaleQuestion(
    id: 'people_04',
    area: BusinessArea.people,
    title: 'A empresa investe no desenvolvimento do time?',
    helper: 'Avalie trilhas, treinamentos e crescimento continuo.',
  ),
  DiagnosisScaleQuestion(
    id: 'people_05',
    area: BusinessArea.people,
    title: 'O clima e engajamento sao monitorados?',
    helper: 'Considere comunicacao, retencao e ambiente de colaboracao.',
  ),
  DiagnosisScaleQuestion(
    id: 'processes_01',
    area: BusinessArea.processes,
    title: 'Os processos principais estao documentados?',
    helper: 'Considere vendas, atendimento, operacao e entrega.',
  ),
  DiagnosisScaleQuestion(
    id: 'processes_02',
    area: BusinessArea.processes,
    title: 'A operacao possui controles para evitar retrabalho?',
    helper: 'Avalie checklists, validacoes e padroes de qualidade.',
  ),
  DiagnosisScaleQuestion(
    id: 'processes_03',
    area: BusinessArea.processes,
    title: 'Os prazos de entrega sao previsiveis?',
    helper: 'Considere lead time, gargalos e capacidade operacional.',
  ),
  DiagnosisScaleQuestion(
    id: 'processes_04',
    area: BusinessArea.processes,
    title: 'A produtividade operacional e acompanhada por indicadores?',
    helper: 'Avalie rotina gerencial e visibilidade de desempenho.',
  ),
  DiagnosisScaleQuestion(
    id: 'processes_05',
    area: BusinessArea.processes,
    title: 'As ferramentas atuais apoiam bem os processos?',
    helper: 'Considere sistemas, automacoes e integracao entre equipes.',
  ),
  DiagnosisScaleQuestion(
    id: 'marketing_01',
    area: BusinessArea.marketing,
    title: 'A empresa possui canais consistentes de geracao de demanda?',
    helper: 'Considere inbound, outbound, parcerias e indicacoes.',
  ),
  DiagnosisScaleQuestion(
    id: 'marketing_02',
    area: BusinessArea.marketing,
    title: 'Existe previsibilidade no funil comercial?',
    helper: 'Avalie etapas, conversao e acompanhamento de oportunidades.',
  ),
  DiagnosisScaleQuestion(
    id: 'marketing_03',
    area: BusinessArea.marketing,
    title: 'A proposta comercial esta bem estruturada?',
    helper: 'Considere argumentacao, precificacao e clareza de oferta.',
  ),
  DiagnosisScaleQuestion(
    id: 'marketing_04',
    area: BusinessArea.marketing,
    title: 'A empresa trabalha retencao e expansao de clientes?',
    helper: 'Avalie pos-venda, relacionamento e crescimento de ticket.',
  ),
  DiagnosisScaleQuestion(
    id: 'marketing_05',
    area: BusinessArea.marketing,
    title: 'Os investimentos em marketing sao medidos por resultado?',
    helper: 'Considere CAC, ROI e origem da receita.',
  ),
  DiagnosisScaleQuestion(
    id: 'financial_01',
    area: BusinessArea.financial,
    title: 'A empresa possui controle confiavel de fluxo de caixa?',
    helper: 'Considere previsao, entradas, saidas e disciplina financeira.',
  ),
  DiagnosisScaleQuestion(
    id: 'financial_02',
    area: BusinessArea.financial,
    title: 'A margem por produto ou servico e conhecida?',
    helper: 'Avalie precificacao, custos e rentabilidade.',
  ),
  DiagnosisScaleQuestion(
    id: 'financial_03',
    area: BusinessArea.financial,
    title: 'Existe planejamento financeiro e orcamentario?',
    helper: 'Considere metas de faturamento, despesas e capital de giro.',
  ),
  DiagnosisScaleQuestion(
    id: 'financial_04',
    area: BusinessArea.financial,
    title: 'As contas a pagar e receber sao bem geridas?',
    helper: 'Avalie inadimplencia, previsibilidade e rotina de fechamento.',
  ),
  DiagnosisScaleQuestion(
    id: 'financial_05',
    area: BusinessArea.financial,
    title: 'Relatorios financeiros apoiam a tomada de decisao?',
    helper: 'Considere DRE, caixa, margem e comparativos mensais.',
  ),
];

const diagnosisWorkspaceTasks = <PriorityTask>[
  PriorityTask(
    title: 'Estruturar fluxo de caixa semanal',
    area: BusinessArea.financial,
    priority: 'Alta',
  ),
  PriorityTask(
    title: 'Definir metas trimestrais da empresa',
    area: BusinessArea.strategy,
    priority: 'Alta',
  ),
  PriorityTask(
    title: 'Padronizar o processo comercial',
    area: BusinessArea.marketing,
    priority: 'Media',
  ),
];

const diagnosisWorkspaceAlerts = <WorkspaceAlert>[
  WorkspaceAlert(
    title: 'Financeiro exige atencao',
    description: 'Mantenha foco em caixa, margem e rotina gerencial.',
  ),
  WorkspaceAlert(
    title: 'Operacao depende de padronizacao',
    description: 'Revise gargalos e reduza retrabalho na execucao.',
  ),
  WorkspaceAlert(
    title: 'Time precisa de ritos de acompanhamento',
    description: 'Crie cadencia de feedback e alinhamento de metas.',
  ),
];

DiagnosisWorkspaceState buildInitialDiagnosisWorkspaceState() {
  return const DiagnosisWorkspaceState(
    companyName: 'Empresa Exemplo',
    questions: diagnosisWorkspaceQuestions,
    answers: {},
    areaScores: [],
    priorityTasks: diagnosisWorkspaceTasks,
    alerts: diagnosisWorkspaceAlerts,
    overallScore: 0,
    completion: 0,
  );
}
