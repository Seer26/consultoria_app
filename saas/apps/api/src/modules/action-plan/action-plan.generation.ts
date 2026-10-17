import { randomUUID } from 'node:crypto';
import type { ActionPlanTaskPriority, ActionPlanTaskSource, TaskRecord } from './action-plan.types';

export function buildTasksFromResearch(input: {
  planId: string;
  submissionId: string;
  companyId: string;
  criticalPoints: string[];
  opportunities: string[];
  recommendations: string[];
  nextSteps: string[];
  pillarScores: Array<{ pillar: string; score: number }>;
}): TaskRecord[] {
  const usedTitles = new Set<string>();
  const tasks: TaskRecord[] = [];
  const now = new Date();
  const pillarPriorityMap = new Map<string, ActionPlanTaskPriority>();

  for (const item of input.pillarScores) {
    if (item.score < 40) {
      pillarPriorityMap.set(item.pillar, 'CRITICA');
    } else if (item.score < 60) {
      pillarPriorityMap.set(item.pillar, 'ALTA');
    } else if (item.score < 75) {
      pillarPriorityMap.set(item.pillar, 'MEDIA');
    } else {
      pillarPriorityMap.set(item.pillar, 'BAIXA');
    }
  }

  const pushTask = (task: {
    title: string;
    description: string;
    pillar: string | null;
    priority: ActionPlanTaskPriority;
    source: ActionPlanTaskSource;
    dueInDays: number;
  }) => {
    const normalizedTitle = task.title.trim().toLowerCase();
    if (!normalizedTitle || usedTitles.has(normalizedTitle)) {
      return;
    }

    usedTitles.add(normalizedTitle);
    const createdAt = now.toISOString();
    const dueDate = new Date(now.getTime());
    dueDate.setDate(dueDate.getDate() + task.dueInDays);

    tasks.push({
      id: randomUUID(),
      companyId: input.companyId,
      planId: input.planId,
      startDate: null,
      progress: 0,
      notes: '',
      submissionId: input.submissionId,
      title: task.title.trim(),
      description: task.description.trim(),
      pillar: task.pillar,
      priority: task.priority,
      status: 'PENDENTE',
      dueDate: dueDate.toISOString(),
      responsibleUserId: null,
      source: task.source,
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
    });
  };

  input.criticalPoints.forEach((criticalPoint, index) => {
    const pillar = extractPillar(criticalPoint, input.pillarScores);
    const recommendation = input.recommendations[index] ?? input.recommendations[0] ?? '';
    const priority = pillar ? pillarPriorityMap.get(pillar) ?? 'ALTA' : 'ALTA';
    pushTask({
      title: pillar ? `Atacar gargalo em ${pillar}` : `Atacar ponto critico ${index + 1}`,
      description: [criticalPoint, recommendation].filter(Boolean).join(' '),
      pillar,
      priority: priority === 'BAIXA' || priority === 'MEDIA' ? 'ALTA' : priority,
      source: 'RESEARCH_RECOMMENDATION',
      dueInDays: priority === 'CRITICA' ? 7 : 10,
    });
  });

  input.recommendations.forEach((recommendation, index) => {
    const pillar = extractPillar(recommendation, input.pillarScores);
    const priority = pillar ? pillarPriorityMap.get(pillar) ?? 'MEDIA' : 'MEDIA';
    pushTask({
      title: pillar ? `Executar recomendacao em ${pillar}` : `Executar recomendacao ${index + 1}`,
      description: recommendation,
      pillar,
      priority,
      source: 'RESEARCH_RECOMMENDATION',
      dueInDays: priority === 'ALTA' || priority === 'CRITICA' ? 14 : 21,
    });
  });

  input.nextSteps.forEach((step, index) => {
    const pillar = extractPillar(step, input.pillarScores);
    const priority = pillar ? pillarPriorityMap.get(pillar) ?? 'MEDIA' : 'MEDIA';
    pushTask({
      title: pillar ? `Proximo passo em ${pillar}` : `Proximo passo ${index + 1}`,
      description: step,
      pillar,
      priority,
      source: 'AI',
      dueInDays: 7 + index * 3,
    });
  });

  input.opportunities.forEach((opportunity, index) => {
    const pillar = extractPillar(opportunity, input.pillarScores);
    pushTask({
      title: pillar ? `Aproveitar oportunidade em ${pillar}` : `Aproveitar oportunidade ${index + 1}`,
      description: opportunity,
      pillar,
      priority: 'MEDIA',
      source: 'AI',
      dueInDays: 21 + index * 3,
    });
  });

  return tasks.slice(0, 12);
}

function extractPillar(
  text: string,
  pillarScores: Array<{ pillar: string; score: number }>,
): string | null {
  const normalized = text.toLowerCase();
  const match = pillarScores.find((item) => normalized.includes(item.pillar.toLowerCase()));
  return match?.pillar ?? null;
}

