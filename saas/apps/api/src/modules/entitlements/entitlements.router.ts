import { Router } from 'express';

import { authenticate, authorize } from '../auth/auth.middleware';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsRepository } from './entitlements.repository';
import { EntitlementsService } from './entitlements.service';

const repository = new EntitlementsRepository();
const service = new EntitlementsService(repository);
const controller = new EntitlementsController(service);

export const entitlementsRouter = Router();

entitlementsRouter.get('/current-plan', authenticate, controller.getCurrentPlan);
entitlementsRouter.get('/admin/plans', authenticate, authorize('ADMIN'), controller.listPlans);
entitlementsRouter.get(
  '/admin/companies/:companyId/current-plan',
  authenticate,
  authorize('ADMIN'),
  controller.getAdminCompanyPlan,
);
entitlementsRouter.put(
  '/admin/companies/:companyId/plan',
  authenticate,
  authorize('ADMIN'),
  controller.updateAdminCompanyPlan,
);
entitlementsRouter.get(
  '/admin/companies/:companyId/plan-events',
  authenticate,
  authorize('ADMIN'),
  controller.listAdminCompanyPlanEvents,
);
