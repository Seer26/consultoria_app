export const behavioralDimensions = ['EXECUTOR', 'COMUNICADOR', 'PLANEJADOR', 'ANALITICO'] as const;
export type BehavioralDimension = typeof behavioralDimensions[number];

export interface BehavioralAnswerForScoring { dimension: BehavioralDimension; value: number; weight: number; reversed: boolean }
export interface BehavioralResult { scores: Record<BehavioralDimension, number>; predominant: string; secondary: BehavioralDimension | null }

export function calculateBehavioralResult(answers: BehavioralAnswerForScoring[]): BehavioralResult {
  if (!answers.length) throw new Error('BEHAVIORAL_ANSWERS_REQUIRED');
  const totals = Object.fromEntries(behavioralDimensions.map((dimension) => [dimension, { earned: 0, max: 0 }])) as Record<BehavioralDimension, { earned: number; max: number }>;
  for (const answer of answers) {
    if (!behavioralDimensions.includes(answer.dimension) || !Number.isInteger(answer.value) || answer.value < 1 || answer.value > 5 || !Number.isFinite(answer.weight) || answer.weight <= 0) throw new Error('BEHAVIORAL_ANSWER_INVALID');
    const value = answer.reversed ? 6 - answer.value : answer.value;
    totals[answer.dimension].earned += (value - 1) * answer.weight;
    totals[answer.dimension].max += 4 * answer.weight;
  }
  const scores = Object.fromEntries(behavioralDimensions.map((dimension) => [dimension, totals[dimension].max ? Math.round((totals[dimension].earned / totals[dimension].max) * 100) : 0])) as Record<BehavioralDimension, number>;
  const ordered = [...behavioralDimensions].sort((a, b) => scores[b] - scores[a]);
  const maximum = scores[ordered[0]];
  const predominant = ordered.filter((dimension) => scores[dimension] === maximum).join(' / ');
  const secondary = ordered.find((dimension) => scores[dimension] < maximum) ?? null;
  return { scores, predominant, secondary };
}
