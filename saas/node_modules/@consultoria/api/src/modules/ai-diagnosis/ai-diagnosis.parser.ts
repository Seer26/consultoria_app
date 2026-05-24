import { AiDiagnosisError } from './ai-diagnosis.errors';
import type { AiDiagnosisResult } from './ai-diagnosis.types';

interface ResponseOutputContent {
  type?: string;
  text?: string;
}

interface ResponseOutputItem {
  type?: string;
  content?: ResponseOutputContent[];
}

interface OpenAiResponsesApiResult {
  output?: ResponseOutputItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSeverity(value: unknown): value is 'high' | 'medium' | 'low' {
  return value === 'high' || value === 'medium' || value === 'low';
}

function getOutputText(data: OpenAiResponsesApiResult): string | null {
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  return null;
}

export function parseAiDiagnosisResponse(data: unknown): AiDiagnosisResult {
  if (!isRecord(data)) {
    throw new AiDiagnosisError(
      'AI_API_INVALID_RESPONSE',
      502,
      'Resposta invalida recebida da OpenAI.',
    );
  }

  const outputText = getOutputText(data as OpenAiResponsesApiResult);

  if (!outputText) {
    throw new AiDiagnosisError(
      'AI_API_EMPTY_RESPONSE',
      502,
      'A OpenAI nao retornou conteudo estruturado.',
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText) as unknown;
  } catch {
    throw new AiDiagnosisError(
      'AI_API_INVALID_JSON_PAYLOAD',
      502,
      'A resposta da OpenAI nao contem JSON valido.',
    );
  }

  if (!isRecord(parsed)) {
    throw new AiDiagnosisError(
      'AI_API_INVALID_JSON_PAYLOAD',
      502,
      'A resposta da OpenAI nao segue o contrato esperado.',
    );
  }

  const problems = Array.isArray(parsed.problems) ? parsed.problems : null;
  const questions = Array.isArray(parsed.questions) ? parsed.questions : null;
  const actions = Array.isArray(parsed.actions) ? parsed.actions : null;

  if (!problems || !questions || !actions) {
    throw new AiDiagnosisError(
      'AI_API_INVALID_JSON_PAYLOAD',
      502,
      'A resposta da OpenAI nao possui os campos obrigatorios.',
    );
  }

  return {
    problems: problems
        .filter(isRecord)
        .map((item) => ({
          area: String(item.area ?? ''),
          title: String(item.title ?? ''),
          description: String(item.description ?? ''),
          severity: isSeverity(item.severity) ? item.severity : 'medium',
        }))
        .filter((item) => item.area && item.title && item.description),
    questions: questions
        .filter(isRecord)
        .map((item) => ({
          area: String(item.area ?? ''),
          question: String(item.question ?? ''),
          reason: String(item.reason ?? ''),
        }))
        .filter((item) => item.area && item.question && item.reason),
    actions: actions
        .filter(isRecord)
        .map((item) => ({
          area: String(item.area ?? ''),
          title: String(item.title ?? ''),
          description: String(item.description ?? ''),
          priority: isSeverity(item.priority) ? item.priority : 'medium',
        }))
        .filter((item) => item.area && item.title && item.description),
  };
}
