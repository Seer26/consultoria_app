import type { Request, Response } from 'express';

import { DashboardService } from './dashboard.service';

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  getAdminOverview = (request: Request, response: Response): void => {
    response.json(this.service.getAdminOverview(request.auth!));
  };

  getCompanyDashboard = (request: Request, response: Response): void => {
    response.json(this.service.getCompanyDashboard(request.auth!));
  };

  getEmployeeDashboard = (request: Request, response: Response): void => {
    response.json(this.service.getEmployeeDashboard(request.auth!));
  };
}
