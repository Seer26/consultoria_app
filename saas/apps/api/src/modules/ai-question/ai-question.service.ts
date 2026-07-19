import OpenAI from 'openai';

import { env } from '../../config/env';
import { audit } from '../../shared/audit';
import type { AuthTokenPayload } from '../auth/auth.types';
import { EntitlementsRepository } from '../entitlements/entitlements.repository';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { buildNextQuestionPrompt } from './ai-question.prompt';

export class AiQuestionService {
  constructor(
    private readonly client = new OpenAI({
      apiKey: env.aiApiKey,
    }),
    private readonly entitlementsService = new EntitlementsService(
      new EntitlementsRepository(),
    ),
  ) {}

  async generateNextQuestion(auth: AuthTokenPayload, answer: string): Promise<string> {
    const normalizedAnswer = answer.trim();

    if (!normalizedAnswer) {
      throw new Error('INVALID_ANSWER');
    }

    const companyId =
      auth.companyId ??
      await this.entitlementsService.resolveUserCompanyId(auth.userId);
    await this.entitlementsService.assertCanUseFeature(
      companyId,
      'AI_QUESTIONS_MONTHLY',
    );

    if (!env.aiApiKey) {
      throw new Error('AI_API_KEY_NOT_CONFIGURED');
    }

    const prompt = buildNextQuestionPrompt(normalizedAnswer);
    audit('ai_request_started', {
      companyId,
      userId: auth.userId,
      provider: 'openai',
    });

    let response;
    try {
      response = await this.client.responses.create({
        model: env.aiQuestionModel,
        input: prompt,
      });
    } catch (error) {
      audit('ai_error', {
        companyId,
        userId: auth.userId,
        provider: 'openai',
        status: error instanceof OpenAI.APIError ? error.status : undefined,
        code: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });

      if (error instanceof OpenAI.APIError) {
        if (error.status === 429 && /quota|credit|billing/i.test(error.message)) {
          throw new Error('AI_QUOTA_UNAVAILABLE');
        }
        if (error.status === 401) {
          throw new Error('AI_INVALID_API_KEY');
        }
        throw new Error('AI_PROVIDER_UNAVAILABLE');
      }
      throw error;
    }

    const nextQuestion = response.output_text?.trim();

    if (!nextQuestion) {
      throw new Error('EMPTY_AI_RESPONSE');
    }

    await this.entitlementsService.recordUsage(companyId, 'AI_QUESTIONS_MONTHLY');
    return nextQuestion;
  }
}
