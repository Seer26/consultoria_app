import type { Request, Response } from 'express';

import {
  EntitlementsService,
  isPlanLimitError,
} from './entitlements.service';

export class EntitlementsController {
  constructor(private readonly service: EntitlementsService) {}

  listPlans = (_request: Request, response: Response): void => {
    try {
      response.status(200).json(this.service.listPlans());
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getCurrentPlan = (request: Request, response: Response): void => {
    try {
      const requestedCompanyId = Array.isArray(request.query.companyId)
        ? request.query.companyId[0]
        : request.query.companyId;
      const companyId =
        request.auth?.role === 'ADMIN'
          ? typeof requestedCompanyId === 'string'
            ? requestedCompanyId
            : null
          : request.auth?.companyId;

      if (!companyId) {
        response.status(400).json({ error: 'COMPANY_ID_REQUIRED' });
        return;
      }

      response.status(200).json(this.service.getCurrentPlan(companyId));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getAdminCompanyPlan = (request: Request, response: Response): void => {
    try {
      response.status(200).json(this.service.getCurrentPlan(this.getParam(request, 'companyId')));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateAdminCompanyPlan = (request: Request, response: Response): void => {
    try {
      const planSlug = request.body?.planSlug;
      if (typeof planSlug !== 'string') {
        response.status(400).json({ error: 'INVALID_PLAN_SLUG' });
        return;
      }

      response
        .status(200)
        .json(this.service.changeCompanyPlan({
          companyId: this.getParam(request, 'companyId'),
          planSlug,
          actorUserId: request.auth!.userId,
          reason: typeof request.body?.reason === 'string' ? request.body.reason : null,
        }));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  listAdminCompanyPlanEvents = (request: Request, response: Response): void => {
    try {
      response
        .status(200)
        .json(this.service.listCompanyPlanEvents(this.getParam(request, 'companyId')));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  private getParam(request: Request, key: string): string {
    const value = request.params[key];
    return Array.isArray(value) ? value[0] : value;
  }

  private handleError(error: unknown, response: Response): void {
    if (isPlanLimitError(error)) {
      response.status(402).json({
        error: error.message,
        feature: error.feature,
        limit: error.limit,
        used: error.used,
        requested: error.requested,
      });
      return;
    }

    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const statusCode = (() => {
      switch (code) {
        case 'COMPANY_ID_REQUIRED':
        case 'INVALID_PLAN_SLUG':
          return 400;
        case 'COMPANY_NOT_FOUND':
        case 'PLAN_NOT_FOUND':
          return 404;
        default:
          return 500;
      }
    })();

    response.status(statusCode).json({ error: code });
  }
}
