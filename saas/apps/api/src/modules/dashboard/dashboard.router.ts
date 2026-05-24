import { Router } from 'express';

import { authenticate, authorize } from '../auth/auth.middleware';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

const service = new DashboardService();
const controller = new DashboardController(service);

export const dashboardRouter = Router();

dashboardRouter.get(
  '/admin/overview',
  authenticate,
  authorize('ADMIN'),
  controller.getAdminOverview,
);

dashboardRouter.get(
  '/company/dashboard',
  authenticate,
  authorize('OWNER'),
  controller.getCompanyDashboard,
);

dashboardRouter.get(
  '/employee/dashboard',
  authenticate,
  authorize('EMPLOYEE'),
  controller.getEmployeeDashboard,
);
