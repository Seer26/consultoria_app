import type {
  ActionTask,
  DiagnosisInsight,
  DiagnosisQuestionAnalysis,
  DiagnosisQuestionnaire,
  PillarKey,
} from '@consultoria/domain';

interface RuleContext {
  questionId: string;
  value: number;
  submissionId: string;
}

type Rule = {
  pillar: PillarKey;
  when: (context: RuleContext) => boolean;
  task: (context: RuleContext) => ActionTask;
};

const createTask = (
  submissionId: string,
  pillar: PillarKey,
  title: string,
  description: string,
  priority: ActionTask['priority'],
): ActionTask => ({
  id: `${submissionId}-${pillar}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  pillar,
  title,
  description,
  priority,
  status: 'pending',
});

const rules: Rule[] = [
  {
    pillar: 'financial',
    when: ({ questionId, value }) => questionId === 'financial-control' && value <= 2,
    task: ({ submissionId }) =>
      createTask(
        submissionId,
        'financial',
        'Implementar fluxo de caixa',
        'Estruturar controle semanal de entradas, saidas e previsao de saldo.',
        'high',
      ),
  },
  {
    pillar: 'strategy',
    when: ({ questionId, value }) => questionId === 'strategy-goals' && value <= 2,
    task: ({ submissionId }) =>
      createTask(
        submissionId,
        'strategy',
        'Definir metas trimestrais',
        'Documentar objetivos, indicadores e responsaveis para os proximos 90 dias.',
        'high',
      ),
  },
  {
    pillar: 'people',
    when: ({ questionId, value }) => questionId === 'people-performance' && value <= 2,
    task: ({ submissionId }) =>
      createTask(
        submissionId,
        'people',
        'Criar rotina de feedback',
        'Estabelecer encontros quinzenais entre lideranca e equipe com pauta objetiva.',
        'medium',
      ),
  },
  {
    pillar: 'processes',
    when: ({ questionId, value }) => questionId === 'processes-standardization' && value <= 2,
    task: ({ submissionId }) =>
      createTask(
        submissionId,
        'processes',
        'Padronizar processos criticos',
        'Mapear etapas, responsaveis e criterios de qualidade das operacoes principais.',
        'high',
      ),
  },
  {
    pillar: 'marketing_sales',
    when: ({ questionId, value }) => questionId === 'sales-pipeline' && value <= 2,
    task: ({ submissionId }) =>
      createTask(
        submissionId,
        'marketing_sales',
        'Estruturar funil comercial',
        'Definir etapas do pipeline, taxa de conversao e rotina semanal de acompanhamento.',
        'medium',
      ),
  },
];

export const buildActionPlan = (
  questionnaire: DiagnosisQuestionnaire,
  answers: Array<{ questionId: string; value: number }>,
  weaknesses: DiagnosisInsight[],
  questionAnalysis: DiagnosisQuestionAnalysis[],
  submissionId: string,
): ActionTask[] => {
  const ruleTasks = rules
    .flatMap((rule) =>
      answers
        .filter((answer) => rule.when({ ...answer, submissionId }))
        .map((answer) => rule.task({ ...answer, submissionId })),
    );

  const fallbackTasks = weaknesses.map((weakness, index) => {
    const mainQuestion = questionAnalysis
      .filter((item) => item.pillar === weakness.pillar)
      .sort((left, right) => right.gap - left.gap)[0];

    if (!mainQuestion) {
      return createTask(
        submissionId,
        weakness.pillar,
        `Fortalecer ${weakness.label}`,
        `Definir um plano de melhoria para a area ${weakness.label}.`,
        index === 0 ? 'high' : 'medium',
      );
    }

    return createTask(
      submissionId,
      weakness.pillar,
      `Melhorar ${mainQuestion.title.toLowerCase()}`,
      `Atuar sobre "${mainQuestion.title}" para reduzir o gap operacional desta area.`,
      index === 0 ? 'high' : 'medium',
    );
  });

  const taskMap = new Map<string, ActionTask>();

  for (const task of [...ruleTasks, ...fallbackTasks]) {
    taskMap.set(task.id, task);
  }

  const tasks = [...taskMap.values()];

  if (tasks.length > 0) {
    return tasks.slice(0, 6);
  }

  const lowestQuestion = [...answers].sort((left, right) => left.value - right.value)[0];
  const fallbackQuestion = questionnaire.questions.find((question) => question.id === lowestQuestion?.questionId);

  if (!fallbackQuestion) {
    return [];
  }

  return [
    createTask(
      submissionId,
      fallbackQuestion.pillar,
      'Executar melhoria prioritaria',
      `Criar um plano de melhoria para a area ${fallbackQuestion.pillar} com base na menor nota atual.`,
      'medium',
    ),
  ];
};
