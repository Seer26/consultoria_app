import type { AiConsultingAnalysis } from '../research/research.types';
import type { AiProviderName } from '../../config/env';

export const CONSULTING_PILLARS = [
  'Financeiro', 'Processos', 'Pessoas/RH', 'Marketing',
  'Comercial', 'Estrategia', 'Operacional',
] as const;

export interface AdaptiveQuestionResult {
  question: string;
  pillar: string;
  reason: string;
  shouldContinue: boolean;
  source: AiProviderName | 'fallback';
}

export interface AiProviderInput {
  instructions: string;
  input: string;
}

export interface AiProvider {
  readonly name: AiProviderName;
  generateNextQuestion(input: AiProviderInput): Promise<unknown>;
  generateConsultingAnalysis(input: AiProviderInput): Promise<unknown>;
}

export type ConsultingAnalysisResult = AiConsultingAnalysis;
