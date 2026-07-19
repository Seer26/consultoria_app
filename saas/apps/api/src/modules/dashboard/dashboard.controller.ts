import type { Request, Response } from 'express';

import { DashboardService } from './dashboard.service';

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  getAdminDashboard = (request: Request, response: Response): void => {
    try {
      response.json(this.service.getAdminDashboard(request.auth!));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getCompanyDashboard = (request: Request, response: Response): void => {
    try {
      response.json(this.service.getCompanyDashboard(request.auth!));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getEmployeeDashboard = (request: Request, response: Response): void => {
    try {
      response.json(this.service.getEmployeeDashboard(request.auth!));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  private handleError(error: unknown, response: Response): void {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    const statusCode = (() => {
      switch (code) {
        case 'FORBIDDEN':
          return 403;
        case 'USER_NOT_FOUND':
        case 'COMPANY_NOT_FOUND':
          return 404;
        case 'INACTIVE_USER':
          return 409;
        case 'COMPANY_ID_REQUIRED':
          return 400;
        default:
          return 500;
      }
    })();

    response.status(statusCode).json({ error: code });
  }
}
