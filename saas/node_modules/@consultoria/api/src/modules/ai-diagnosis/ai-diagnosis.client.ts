import { env } from '../../config/env';
import { AiDiagnosisError } from './ai-diagnosis.errors';
import { parseAiDiagnosisResponse } from './ai-diagnosis.parser';
import { buildAiDiagnosisPrompt } from './ai-diagnosis.prompt';
import { aiDiagnosisJsonSchema } from './ai-diagnosis.schema';
import type { AiDiagnosisAnswerInput, AiDiagnosisResult } from './ai-diagnosis.types';

export class AiDiagnosisClient {
  async generate(answers: AiDiagnosisAnswerInput[]): Promise<AiDiagnosisResult> {
    if (!env.aiApiKey) {
      throw new AiDiagnosisError(
        'AI_API_KEY_NOT_CONFIGURED',
        500,
        'OpenAI API key nao configurada.',
      );
    }

    const prompt = buildAiDiagnosisPrompt(answers);
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), env.aiTimeoutMs);

    try {
      const response = await fetch(env.aiApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.aiApiKey}`,
        },
        signal: abortController.signal,
        body: JSON.stringify({
          model: env.aiModel,
          input: prompt,
          instructions:
            'Voce transforma respostas de diagnostico empresarial em um JSON estruturado para uso em software.',
          text: {
            format: {
              type: 'json_schema',
              ...aiDiagnosisJsonSchema,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new AiDiagnosisError(
          'AI_API_REQUEST_FAILED',
          502,
          `Falha na chamada da OpenAI: ${response.status} ${errorBody}`,
        );
      }

      const data = await response.json();
      return parseAiDiagnosisResponse(data);
    } catch (error) {
      if (error instanceof AiDiagnosisError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AiDiagnosisError(
          'AI_API_TIMEOUT',
          504,
          'A chamada para OpenAI excedeu o tempo limite.',
        );
      }

      throw new AiDiagnosisError(
        'AI_API_UNAVAILABLE',
        502,
        error instanceof Error ? error.message : 'Falha desconhecida ao consultar OpenAI.',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
