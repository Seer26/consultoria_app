import { AiDiagnosisError, isAiDiagnosisError } from './ai-diagnosis.errors';
import { buildFallbackAiDiagnosis } from './ai-diagnosis.fallback';
import { AiDiagnosisClient } from './ai-diagnosis.client';
import type { AiDiagnosisAnswerInput, AiDiagnosisInput, AiDiagnosisResult } from './ai-diagnosis.types';

function isValidAnswer(answer: AiDiagnosisAnswerInput): boolean {
  return typeof answer.answer === 'number' || typeof answer.answer === 'string';
}

export class AiDiagnosisService {
  constructor(private readonly client: AiDiagnosisClient) {}

  async execute(input: AiDiagnosisInput): Promise<AiDiagnosisResult> {
    if (!Array.isArray(input.answers) || input.answers.length === 0) {
      throw new AiDiagnosisError(
        'INVALID_ANSWERS_PAYLOAD',
        400,
        'O campo answers deve ser um array nao vazio.',
      );
    }

    const answers = input.answers.filter(isValidAnswer);

    if (answers.length === 0) {
      throw new AiDiagnosisError(
        'INVALID_ANSWERS_PAYLOAD',
        400,
        'As respostas enviadas sao invalidas.',
      );
    }

    try {
      return await this.client.generate(answers);
    } catch (error) {
      if (isAiDiagnosisError(error) && error.code === 'AI_API_KEY_NOT_CONFIGURED') {
        return buildFallbackAiDiagnosis(answers);
      }

      if (isAiDiagnosisError(error)) {
        return buildFallbackAiDiagnosis(answers);
      }

      return buildFallbackAiDiagnosis(answers);
    }
  }
}
