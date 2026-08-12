import type { Request, Response } from 'express';

import { writePlanLimitResponse } from '../entitlements/entitlements.middleware';
import { AiQuestionService } from './ai-question.service';

export class AiQuestionController {
  constructor(private readonly service: AiQuestionService) {}

  nextQuestion = async (request: Request, response: Response): Promise<void> => {
    try {
      const submissionId = request.body?.submissionId;
      if (typeof submissionId !== 'string') {
        response.status(400).json({ error: 'INVALID_SUBMISSION_ID' });
        return;
      }
      response.status(200).json(await this.service.generateNextQuestion(request.auth!, submissionId));
    } catch (error) { this.handleError(error, response); }
  };

  analysis = async (request: Request, response: Response): Promise<void> => {
    try {
      const submissionId = Array.isArray(request.params.submissionId)
        ? request.params.submissionId[0] : request.params.submissionId;
      response.status(200).json(await this.service.generateAnalysis(
        request.auth!, submissionId, request.body?.retry === true,
      ));
    } catch (error) { this.handleError(error, response); }
  };

  private handleError(error: unknown, response: Response): void {
    if (writePlanLimitResponse(error, response)) return;
    const code = error instanceof Error ? error.message : 'AI_ANALYSIS_UNAVAILABLE';
    const status = ['INVALID_SUBMISSION_ID', 'AI_ANALYSIS_REQUIRES_COMPLETED_RESEARCH'].includes(code) ? 400
      : ['FORBIDDEN', 'ADMIN_RESEARCH_READ_ONLY'].includes(code) ? 403
      : ['RESEARCH_SUBMISSION_NOT_FOUND', 'USER_NOT_FOUND'].includes(code) ? 404
      : ['AI_RATE_LIMITED', 'AI_QUOTA_UNAVAILABLE'].includes(code) ? 429 : 503;
    response.status(status).json({ error: code });
  }
}
