import type { Request, Response } from 'express';

import { ActionPlanService } from './action-plan.service';

export class ActionPlanController {
  constructor(private readonly service: ActionPlanService) {}

  private getParam(request: Request, key: string): string {
    const value = request.params[key];
    return Array.isArray(value) ? value[0] : value;
  }

  listTasks = (request: Request, response: Response): void => {
    try {
      const companyId = Array.isArray(request.query.companyId)
        ? request.query.companyId[0]
        : request.query.companyId;
      const submissionId = Array.isArray(request.query.submissionId)
        ? request.query.submissionId[0]
        : request.query.submissionId;

      const result = this.service.listTasks(request.auth!, {
        companyId: typeof companyId === 'string' ? companyId : undefined,
        submissionId: typeof submissionId === 'string' ? submissionId : undefined,
      });
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getTaskById = (request: Request, response: Response): void => {
    try {
      const result = this.service.getTaskById(request.auth!, this.getParam(request, 'id'));
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  createTask = (request: Request, response: Response): void => {
    try {
      const result = this.service.createTask(request.auth!, request.body ?? {});
      response.status(201).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateTask = (request: Request, response: Response): void => {
    try {
      const result = this.service.updateTask(
        request.auth!,
        this.getParam(request, 'id'),
        request.body ?? {},
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateTaskStatus = (request: Request, response: Response): void => {
    try {
      const result = this.service.updateTaskStatus(
        request.auth!,
        this.getParam(request, 'id'),
        request.body ?? {},
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  private handleError(error: unknown, response: Response): void {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    const statusCode = (() => {
      switch (code) {
        case 'ACTION_PLAN_TITLE_REQUIRED':
        case 'INVALID_ACTION_PLAN_PRIORITY':
        case 'INVALID_ACTION_PLAN_STATUS':
        case 'INVALID_ACTION_PLAN_SOURCE':
        case 'INVALID_ACTION_PLAN_DUE_DATE':
        case 'RESPONSIBLE_USER_COMPANY_MISMATCH':
        case 'SUBMISSION_COMPANY_MISMATCH':
        case 'COMPANY_ID_REQUIRED':
          return 400;
        case 'FORBIDDEN':
          return 403;
        case 'ACTION_PLAN_TASK_NOT_FOUND':
        case 'RESPONSIBLE_USER_NOT_FOUND':
        case 'USER_NOT_FOUND':
        case 'COMPANY_NOT_FOUND':
        case 'RESEARCH_SUBMISSION_NOT_FOUND':
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
