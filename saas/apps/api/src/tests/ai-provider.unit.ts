import assert from 'node:assert/strict';
import OpenAI from 'openai';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.DATABASE_URL = 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.AI_ENABLED = 'true';
process.env.AI_PROVIDER = 'gemini';
process.env.AI_MODEL = 'gemini-3.5-flash-lite';
process.env.GEMINI_API_KEY = 'test-gemini-key-never-sent';

const { env, parseAiProvider, resolveAiProviderKey } = await import('../config/env');
const {
  GeminiProvider,
  OpenAiProvider,
  createAiProvider,
  normalizeAiProviderError,
} = await import('../modules/ai-question/ai-question.client');

const input = {
  instructions: 'Responda com dados sinteticos.',
  input: 'Contexto sintetico.',
};
const structured = { question: 'Qual indicador orienta as decisoes mensais?' };

{
  const captured: Record<string, unknown>[] = [];
  const client = {
    chat: { completions: { parse: async (request: Record<string, unknown>) => {
      captured.push(request);
      return { choices: [{ message: { parsed: structured } }] };
    } } },
  };
  const provider = new GeminiProvider(client as never);
  assert.deepEqual(await provider.generateNextQuestion(input), structured);
  assert.deepEqual(await provider.generateConsultingAnalysis(input), structured);
  assert.equal(captured[0]?.model, 'gemini-3.5-flash-lite');
  assert(captured[0]?.response_format);
}

{
  const captured: Record<string, unknown>[] = [];
  const client = {
    responses: { create: async (request: Record<string, unknown>) => {
      captured.push(request);
      return { output_text: JSON.stringify(structured) };
    } },
  };
  (env as { aiModel: string }).aiModel = 'gpt-test-model';
  const provider = new OpenAiProvider(client as never);
  assert.deepEqual(await provider.generateNextQuestion(input), structured);
  assert.equal(captured[0]?.model, 'gpt-test-model');
  assert(captured[0]?.text);
  (env as { aiModel: string }).aiModel = 'gemini-3.5-flash-lite';
}

assert.equal(createAiProvider('gemini').name, 'gemini');
assert.equal(createAiProvider('openai').name, 'openai');
assert.equal(parseAiProvider(undefined), 'gemini');
assert.throws(() => parseAiProvider('invalid-provider'), /AI_PROVIDER_INVALID/);
assert.equal(resolveAiProviderKey('gemini', { gemini: '', openai: 'openai-key' }), '');
assert.equal(resolveAiProviderKey('openai', { gemini: 'gemini-key', openai: '' }), '');
assert.equal(normalizeAiProviderError({ status: 401 }).message, 'AI_AUTHENTICATION_FAILED');
assert.equal(normalizeAiProviderError({ status: 429, message: 'RESOURCE_EXHAUSTED quota' }).message, 'AI_QUOTA_UNAVAILABLE');
assert.equal(normalizeAiProviderError({ status: 429, message: 'rate limit' }).message, 'AI_RATE_LIMITED');
assert.equal(normalizeAiProviderError({ status: 404, message: 'model unavailable' }).message, 'AI_PROVIDER_REJECTED');
assert.equal(normalizeAiProviderError({ status: 503 }).message, 'AI_PROVIDER_UNAVAILABLE');
assert.equal(normalizeAiProviderError(Object.assign(new Error(), { name: 'AbortError' })).message, 'AI_TIMEOUT');
assert.equal(normalizeAiProviderError(new OpenAI.APIUserAbortError()).message, 'AI_TIMEOUT');

console.log(JSON.stringify({
  ok: true,
  geminiProvider: true,
  openAiProvider: true,
  invalidProvider: true,
  structuredOutput: true,
  sanitizedErrorMapping: true,
  realProviderCalls: 0,
}));
