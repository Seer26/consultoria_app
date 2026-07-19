import type { Request, Response } from 'express';

import { writePlanLimitResponse } from '../entitlements/entitlements.middleware';
import { AiQuestionService } from './ai-question.service';

export class AiQuestionController {
  constructor(private readonly service: AiQuestionService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    try {
      const answer = request.body?.answer;

      if (typeof answer !== 'string') {
        response.status(400).json({ error: 'INVALID_ANSWER' });
        return;
      }

      const nextQuestion = await this.service.generateNextQuestion(request.auth!, answer);
      response.status(200).json({ nextQuestion });
    } catch (error) {
      if (writePlanLimitResponse(error, response)) {
        return;
      }

      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      const statusCode = (() => {
        switch (code) {
          case 'INVALID_ANSWER':
          case 'COMPANY_ID_REQUIRED':
            return 400;
          case 'AI_QUOTA_UNAVAILABLE':
            return 429;
          case 'AI_API_KEY_NOT_CONFIGURED':
          case 'AI_INVALID_API_KEY':
          case 'AI_PROVIDER_UNAVAILABLE':
            return 503;
          default:
            return 500;
        }
      })();

      response.status(statusCode).json({ error: code });
    }
  };
}
