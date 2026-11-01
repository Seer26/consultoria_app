import type { Request, Response } from 'express';

import { BehavioralService } from './behavioral.service';
import type { BehavioralStatus } from './behavioral.types';

export class BehavioralController {
  constructor(private readonly service: BehavioralService) {}

  startOrResume = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.startOrResume(request.auth!), 201);
  };

  getQuestions = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.getQuestions(request.auth!, this.param(request, 'assessmentId')));
  };

  saveAnswer = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.saveAnswer(request.auth!, this.param(request, 'assessmentId'),
      this.param(request, 'questionId'), request.body?.value));
  };

  complete = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.complete(request.auth!, this.param(request, 'assessmentId')));
  };

  listCompanyAssessments = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => {
      const userId = this.query(request, 'userId');
      const status = this.query(request, 'status');
      return this.service.listCompanyAssessments(request.auth!, this.param(request, 'companyId'),
        { userId, status: status as BehavioralStatus | undefined });
    });
  };

  getHistory = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.getHistory(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'userId')));
  };

  getAdminResult = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.getAdminResult(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'assessmentId')));
  };

  private param(request: Request, key: string): string {
    const value = request.params[key];
    return Array.isArray(value) ? value[0] : value;
  }

  private query(request: Request, key: string): string | undefined {
    const value = request.query[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !value.trim()) throw new Error('BEHAVIORAL_INVALID_FILTER');
    return value;
  }

  private async respond(response: Response, operation: () => Promise<unknown>, successStatus = 200): Promise<void> {
    try {
      response.status(successStatus).json(await operation());
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      const statuses: Record<string, number> = {
        BEHAVIORAL_INVALID_ANSWER: 400,
        BEHAVIORAL_INVALID_ANSWERS: 400,
        BEHAVIORAL_INCOMPLETE_ANSWERS: 400,
        BEHAVIORAL_INVALID_STATUS: 400,
        BEHAVIORAL_INVALID_FILTER: 400,
        COMPANY_ID_REQUIRED: 400,
        FORBIDDEN: 403,
        BEHAVIORAL_ADMIN_REQUIRED: 403,
        BEHAVIORAL_RESPONDENT_REQUIRED: 403,
        USER_NOT_FOUND: 404,
        COMPANY_NOT_FOUND: 404,
        BEHAVIORAL_ASSESSMENT_NOT_FOUND: 404,
        BEHAVIORAL_QUESTION_NOT_FOUND: 404,
        BEHAVIORAL_RESULT_NOT_FOUND: 404,
        BEHAVIORAL_CATALOG_NOT_FOUND: 404,
        INACTIVE_USER: 409,
        BEHAVIORAL_ASSESSMENT_COMPLETED: 409,
      };
      response.status(statuses[code] ?? 500).json({ error: statuses[code] ? code : 'INTERNAL_SERVER_ERROR' });
    }
  }
}
