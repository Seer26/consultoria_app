export const behavioralDimensions = ['EXECUTOR', 'COMUNICADOR', 'PLANEJADOR', 'ANALITICO'] as const;
export type BehavioralDimension = typeof behavioralDimensions[number];
export type FitClassification = 'ADERENCIA_MUITO_ALTA' | 'ADERENCIA_ALTA' | 'ADERENCIA_MODERADA' | 'ADERENCIA_BAIXA' | 'ADERENCIA_MUITO_BAIXA';
export type GapCriticality = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

type Requirement = { id: string; name: string; expected: number; weight: number; actual: number };
type FitInput = { expectedBehavior: Record<BehavioralDimension, number>; actualBehavior: Record<BehavioralDimension, number>; behavioralWeight: number; competencyWeight: number; requirements: Requirement[] };
const round = (value: number) => Math.round(value * 10) / 10;
const percentage = (value: number) => Math.max(0, Math.min(100, value));

export function classifyJobFit(score: number): FitClassification {
  if (score >= 90) return 'ADERENCIA_MUITO_ALTA';
  if (score >= 75) return 'ADERENCIA_ALTA';
  if (score >= 60) return 'ADERENCIA_MODERADA';
  if (score >= 40) return 'ADERENCIA_BAIXA';
  return 'ADERENCIA_MUITO_BAIXA';
}

export function gapCriticality(difference: number, weight: number): GapCriticality {
  const impact = difference * weight;
  if (impact >= 10) return 'CRITICA';
  if (impact >= 6) return 'ALTA';
  if (impact >= 3) return 'MEDIA';
  return 'BAIXA';
}

export function calculateJobFit(input: FitInput) {
  if (!Number.isInteger(input.behavioralWeight) || !Number.isInteger(input.competencyWeight) || input.behavioralWeight < 0 || input.competencyWeight < 0 || input.behavioralWeight + input.competencyWeight !== 100) throw new Error('FIT_WEIGHTS_INVALID');
  for (const dimension of behavioralDimensions) if (!Number.isFinite(input.expectedBehavior[dimension]) || !Number.isFinite(input.actualBehavior[dimension]) || input.expectedBehavior[dimension] < 0 || input.expectedBehavior[dimension] > 100 || input.actualBehavior[dimension] < 0 || input.actualBehavior[dimension] > 100) throw new Error('FIT_BEHAVIOR_INVALID');
  for (const requirement of input.requirements) if (!requirement.id || !requirement.name || !Number.isInteger(requirement.expected) || !Number.isInteger(requirement.actual) || !Number.isInteger(requirement.weight) || requirement.expected < 0 || requirement.expected > 5 || requirement.actual < 0 || requirement.actual > 5 || requirement.weight <= 0) throw new Error('FIT_REQUIREMENT_INVALID');
  const behavioralScores = Object.fromEntries(behavioralDimensions.map(dimension => [dimension, percentage(100 - Math.abs(input.actualBehavior[dimension] - input.expectedBehavior[dimension]))])) as Record<BehavioralDimension, number>;
  const behavioralScore = round(behavioralDimensions.reduce((sum, dimension) => sum + behavioralScores[dimension], 0) / behavioralDimensions.length);
  const competencyRows = input.requirements.map(requirement => ({ ...requirement, adherence: requirement.expected === 0 ? 100 : percentage((requirement.actual / requirement.expected) * 100), difference: Math.max(0, requirement.expected - requirement.actual) }));
  const totalWeight = competencyRows.reduce((sum, item) => sum + item.weight, 0);
  const competencyScore = round(totalWeight ? competencyRows.reduce((sum, item) => sum + item.adherence * item.weight, 0) / totalWeight : 100);
  const overallScore = round((behavioralScore * input.behavioralWeight + competencyScore * input.competencyWeight) / 100);
  const gaps = competencyRows.filter(item => item.difference > 0).map(item => ({ ...item, criticality: gapCriticality(item.difference, item.weight) })).sort((a, b) => b.difference * b.weight - a.difference * a.weight);
  const strengths = competencyRows.filter(item => item.difference === 0);
  return { behavioralScore, behavioralScores, competencyScore, overallScore, classification: classifyJobFit(overallScore), gaps, strengths, competencyRows };
}
