import type { Request, Response } from 'express';

import { writePlanLimitResponse } from '../entitlements/entitlements.middleware';
import { ActionPlanService } from './action-plan.service';

export class ActionPlanController {
  constructor(private readonly service: ActionPlanService) {}

  private getParam(request: Request, key: string): string {
    const value = request.params[key];
    return Array.isArray(value) ? value[0] : value;
  }

  listTasks = async (request: Request, response: Response): Promise<void> => {
    try {
      const companyId = Array.isArray(request.query.companyId)
        ? request.query.companyId[0]
        : request.query.companyId;
      const submissionId = Array.isArray(request.query.submissionId)
        ? request.query.submissionId[0]
        : request.query.submissionId;
      const scope = Array.isArray(request.query.scope)
        ? request.query.scope[0]
        : request.query.scope;
      const search = Array.isArray(request.query.search)
        ? request.query.search[0]
        : request.query.search;

      const result = await this.service.listTasks(request.auth!, {
        companyId: typeof companyId === 'string' ? companyId : undefined,
        submissionId: typeof submissionId === 'string' ? submissionId : undefined,
        scope:
          typeof scope === 'string'
            ? (scope as 'all' | 'mine' | 'overdue' | 'dueSoon' | 'critical' | 'completed')
            : undefined,
        search: typeof search === 'string' ? search : undefined,
      });
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  listAssignees = async (request: Request, response: Response): Promise<void> => {
    try {
      const companyId = Array.isArray(request.query.companyId)
        ? request.query.companyId[0]
        : request.query.companyId;
      const result = await this.service.listAssignees(
        request.auth!,
        typeof companyId === 'string' ? companyId : undefined,
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getTaskById = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.getTaskById(
        request.auth!,
        this.getParam(request, 'id'),
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  createTask = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.createTask(request.auth!, request.body ?? {});
      response.status(201).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateTask = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.updateTask(
        request.auth!,
        this.getParam(request, 'id'),
        request.body ?? {},
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateTaskStatus = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.updateTaskStatus(
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
    if (writePlanLimitResponse(error, response)) {
      return;
    }

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
        case 'RESPONSIBLE_USER_INACTIVE':
          return 409;
        default:
          return 500;
      }
    })();

    response.status(statusCode).json({ error: code });
  }
}
