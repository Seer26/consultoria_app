import { Router } from 'express';

import { authenticate, authorize } from '../auth/auth.middleware';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

const repository = new DashboardRepository();
const service = new DashboardService(repository);
const controller = new DashboardController(service);

export const dashboardRouter = Router();

dashboardRouter.get(
  '/dashboard/admin',
  authenticate,
  authorize('ADMIN'),
  controller.getAdminDashboard,
);

dashboardRouter.get(
  '/dashboard/company',
  authenticate,
  authorize('OWNER'),
  controller.getCompanyDashboard,
);

dashboardRouter.get(
  '/dashboard/employee',
  authenticate,
  authorize('EMPLOYEE'),
  controller.getEmployeeDashboard,
);
