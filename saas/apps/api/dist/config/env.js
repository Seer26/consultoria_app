export const env = {
    port: Number(process.env.PORT ?? 3000),
    databasePath: process.env.DATABASE_PATH ?? './data/consultoria.sqlite',
    aiApiKey: process.env.AI_API_KEY ?? '',
    aiApiUrl: process.env.AI_API_URL ?? 'https://api.openai.com/v1/responses',
    aiModel: process.env.AI_MODEL ?? 'gpt-4o-mini',
    aiQuestionModel: process.env.AI_QUESTION_MODEL ?? 'gpt-4.1-mini',
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 20000),
    jwtSecret: process.env.JWT_SECRET ?? 'consultoria-local-dev-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
};
