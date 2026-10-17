import { randomBytes } from 'node:crypto';

export function resolveJwtSecret(settings: Record<string, string | undefined>): string {
  if (settings.JWT_SECRET) {
    if (settings.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must have at least 32 characters');
    return settings.JWT_SECRET;
  }
  if (settings.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
  // Development sessions expire on process restart; no public, forgeable signing key.
  return randomBytes(32).toString('hex');
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? './data/consultoria.sqlite',
  aiApiKey: process.env.AI_API_KEY ?? '',
  aiApiUrl: process.env.AI_API_URL ?? 'https://api.openai.com/v1/responses',
  aiModel: process.env.AI_MODEL ?? 'gpt-4o-mini',
  aiQuestionModel: process.env.AI_QUESTION_MODEL ?? 'gpt-4.1-mini',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 20000),
  jwtSecret: resolveJwtSecret(process.env),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
};
