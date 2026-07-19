import type { Request, Response } from 'express';

import { writePlanLimitResponse } from '../entitlements/entitlements.middleware';
import { ResearchService } from './research.service';

export class ResearchController {
  constructor(private readonly service: ResearchService) {}

  private getParam(request: Request, key: string): string {
    const value = request.params[key];
    return Array.isArray(value) ? value[0] : value;
  }

  createSubmission = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.createSubmission(request.auth!, request.body);
      response.status(201).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  addAnswer = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.addAnswer(
        request.auth!,
        this.getParam(request, 'id'),
        request.body,
      );
      response.status(201).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  completeSubmission = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.completeSubmission(
        request.auth!,
        this.getParam(request, 'id'),
        request.body ?? {},
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  listSubmissions = async (request: Request, response: Response): Promise<void> => {
    try {
      const companyId = Array.isArray(request.query.companyId)
        ? request.query.companyId[0]
        : request.query.companyId;

      const result = await this.service.listSubmissions(request.auth!, {
        companyId: typeof companyId === 'string' ? companyId : undefined,
      });
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getSubmissionById = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.getSubmissionById(
        request.auth!,
        this.getParam(request, 'id'),
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  generateActionPlan = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.generateActionPlan(
        request.auth!,
        this.getParam(request, 'id'),
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  private handleError(error: unknown, response: Response): void {
    if (writePlanLimitResponse(error, response)) {
      return;
    }

    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    const statusCode = (() => {
      switch (code) {
        case 'INVALID_RESEARCH_SUBMISSION_PAYLOAD':
        case 'INVALID_RESEARCH_ANSWER_PAYLOAD':
        case 'COMPANY_ID_REQUIRED':
        case 'RESEARCH_ALREADY_COMPLETED':
        case 'RESEARCH_ANSWERS_REQUIRED':
        case 'USER_COMPANY_MISMATCH':
        case 'ACTION_PLAN_SUBMISSION_NOT_COMPLETED':
          return 400;
        case 'FORBIDDEN':
        case 'ADMIN_RESEARCH_READ_ONLY':
          return 403;
        case 'USER_NOT_FOUND':
        case 'COMPANY_NOT_FOUND':
        case 'RESEARCH_SUBMISSION_NOT_FOUND':
        case 'ACTION_PLAN_TASK_NOT_FOUND':
          return 404;
        case 'INACTIVE_USER':
          return 409;
        default:
          return 500;
      }
    })();

    response.status(statusCode).json({ error: code });
  }
}
