import OpenAI from 'openai';

import { env } from '../../config/env';
import type { StructuredAiProvider } from './ai-question.types';

export class OpenAiStructuredProvider implements StructuredAiProvider {
  constructor(private readonly client = new OpenAI({ apiKey: env.aiApiKey })) {}

  async generate(input: Parameters<StructuredAiProvider['generate']>[0]): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.aiTimeoutMs);
    try {
      const response = await this.client.responses.create({
        model: env.aiModel,
        instructions: input.instructions,
        input: input.input,
        text: {
          format: {
            type: 'json_schema',
            name: input.schemaName,
            strict: true,
            schema: input.schema,
          },
        },
      }, { signal: controller.signal });
      if (!response.output_text?.trim()) throw new Error('AI_INVALID_RESPONSE');
      try {
        return JSON.parse(response.output_text);
      } catch {
        throw new Error('AI_INVALID_RESPONSE');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AI_TIMEOUT');
      }
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401 || error.status === 403) throw new Error('AI_AUTHENTICATION_FAILED');
        if (error.status === 429) {
          throw new Error(/quota|credit|billing/i.test(error.message) ? 'AI_QUOTA_UNAVAILABLE' : 'AI_RATE_LIMITED');
        }
        if ((error.status ?? 0) >= 500) throw new Error('AI_PROVIDER_UNAVAILABLE');
        throw new Error('AI_PROVIDER_REJECTED');
      }
      if (error instanceof Error && error.message === 'AI_INVALID_RESPONSE') throw error;
      throw new Error('AI_PROVIDER_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }
}
