import { Router } from 'express';

import { authenticate } from '../auth/auth.middleware';
import { AiQuestionController } from './ai-question.controller';
import { AiQuestionService } from './ai-question.service';
import { env } from '../../config/env';
import { authenticatedUserRateLimitKey, createRateLimiter } from '../../shared/rate-limit';

const service = new AiQuestionService();
const controller = new AiQuestionController(service);

export const aiQuestionRouter = Router();

const aiRateLimit = createRateLimiter({
  action: 'ai_rate_limit_blocked',
  windowMs: env.aiRateLimitWindowMs,
  max: env.aiRateLimitMax,
  key: authenticatedUserRateLimitKey,
  message: 'Muitas solicitacoes de IA em sequencia. Aguarde um momento e tente novamente.',
});

const nextQuestionHandlers = [
  authenticate,
  aiRateLimit,
  controller.nextQuestion,
] as const;

aiQuestionRouter.post('/next-question', ...nextQuestionHandlers);
aiQuestionRouter.post('/question/next', ...nextQuestionHandlers);
aiQuestionRouter.post('/research/:submissionId/analysis', authenticate, aiRateLimit, controller.analysis);
