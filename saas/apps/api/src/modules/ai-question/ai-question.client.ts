import OpenAI from 'openai';
import { makeParseableResponseFormat } from 'openai/lib/parser';

import { env, type AiProviderName } from '../../config/env';
import { adaptiveQuestionSchema, consultingAnalysisSchema } from './ai-question.schemas';
import type { AiProvider, AiProviderInput } from './ai-question.types';

const GEMINI_OPENAI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/';

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('AI_INVALID_RESPONSE');
  }
}

export function normalizeAiProviderError(error: unknown): Error {
  if (error instanceof Error && error.message === 'AI_INVALID_RESPONSE') return error;
  if (
    error instanceof OpenAI.APIUserAbortError ||
    error instanceof OpenAI.APIConnectionTimeoutError ||
    (error instanceof Error && error.name === 'AbortError')
  ) return new Error('AI_TIMEOUT');
  const candidate = error as { status?: unknown; message?: unknown } | null;
  const status = typeof candidate?.status === 'number' ? candidate.status : 0;
  const message = typeof candidate?.message === 'string' ? candidate.message : '';
  if (status === 401 || status === 403) return new Error('AI_AUTHENTICATION_FAILED');
  if (status === 429) {
    return new Error(/quota|credit|billing|resource.?exhausted/i.test(message)
      ? 'AI_QUOTA_UNAVAILABLE' : 'AI_RATE_LIMITED');
  }
  if (status >= 500) return new Error('AI_PROVIDER_UNAVAILABLE');
  if (status >= 400) return new Error('AI_PROVIDER_REJECTED');
  return new Error('AI_PROVIDER_UNAVAILABLE');
}

abstract class BaseAiProvider implements AiProvider {
  abstract readonly name: AiProviderName;
  abstract generateNextQuestion(input: AiProviderInput): Promise<unknown>;
  abstract generateConsultingAnalysis(input: AiProviderInput): Promise<unknown>;

  protected async withTimeout(operation: (signal: AbortSignal) => Promise<unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.aiTimeoutMs);
    try {
      return await operation(controller.signal);
    } catch (error) {
      throw normalizeAiProviderError(error);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class OpenAiProvider extends BaseAiProvider {
  readonly name = 'openai' as const;

  constructor(private readonly client: OpenAI = new OpenAI({
    apiKey: env.openAiApiKey,
    maxRetries: 0,
  })) {
    super();
  }

  generateNextQuestion(input: AiProviderInput): Promise<unknown> {
    return this.generate(input, 'adaptive_question', adaptiveQuestionSchema);
  }

  generateConsultingAnalysis(input: AiProviderInput): Promise<unknown> {
    return this.generate(input, 'consulting_analysis', consultingAnalysisSchema);
  }

  private generate(input: AiProviderInput, schemaName: string, schema: Record<string, unknown>): Promise<unknown> {
    return this.withTimeout(async (signal) => {
      const response = await this.client.responses.create({
        model: env.aiModel,
        instructions: input.instructions,
        input: input.input,
        text: { format: {
          type: 'json_schema', name: schemaName,
          strict: true, schema,
        } },
      }, { signal });
      if (!response.output_text?.trim()) throw new Error('AI_INVALID_RESPONSE');
      return parseJson(response.output_text);
    });
  }
}

export class GeminiProvider extends BaseAiProvider {
  readonly name = 'gemini' as const;

  constructor(private readonly client: OpenAI = new OpenAI({
    apiKey: env.geminiApiKey,
    baseURL: GEMINI_OPENAI_BASE_URL,
    maxRetries: 0,
  })) {
    super();
  }

  generateNextQuestion(input: AiProviderInput): Promise<unknown> {
    return this.generate(input, 'adaptive_question', adaptiveQuestionSchema);
  }

  generateConsultingAnalysis(input: AiProviderInput): Promise<unknown> {
    return this.generate(input, 'consulting_analysis', consultingAnalysisSchema);
  }

  private generate(input: AiProviderInput, schemaName: string, schema: Record<string, unknown>): Promise<unknown> {
    return this.withTimeout(async (signal) => {
      const responseFormat = makeParseableResponseFormat({
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      }, parseJson);
      const completion = await this.client.chat.completions.parse({
        model: env.aiModel,
        messages: [
          { role: 'system', content: input.instructions },
          { role: 'user', content: input.input },
        ],
        response_format: responseFormat,
      }, { signal });
      const parsed = completion.choices[0]?.message.parsed;
      if (!parsed) throw new Error('AI_INVALID_RESPONSE');
      return parsed;
    });
  }
}

export function createAiProvider(provider: AiProviderName = env.aiProvider): AiProvider {
  return provider === 'gemini' ? new GeminiProvider() : new OpenAiProvider();
}
