import type { AiConsultingAnalysis } from '../research/research.types';

export const CONSULTING_PILLARS = [
  'Financeiro', 'Processos', 'Pessoas/RH', 'Marketing',
  'Comercial', 'Estrategia', 'Operacional',
] as const;

export interface AdaptiveQuestionResult {
  question: string;
  pillar: string;
  reason: string;
  shouldContinue: boolean;
  source: 'openai' | 'fallback';
}

export interface StructuredAiProvider {
  generate(input: {
    operation: 'adaptive_question' | 'consulting_analysis';
    schemaName: string;
    schema: Record<string, unknown>;
    instructions: string;
    input: string;
  }): Promise<unknown>;
}

export type ConsultingAnalysisResult = AiConsultingAnalysis;
