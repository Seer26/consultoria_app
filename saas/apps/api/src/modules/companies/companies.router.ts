import { Router } from 'express';

import { authenticate, authorize } from '../auth/auth.middleware';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './companies.repository';
import { CompaniesService } from './companies.service';

const repository = new CompaniesRepository();
const service = new CompaniesService(repository);
const controller = new CompaniesController(service);

export const companiesRouter = Router();

companiesRouter.get(
  '/companies',
  authenticate,
  authorize('ADMIN'),
  controller.listCompanies,
);
companiesRouter.get(
  '/companies/:id',
  authenticate,
  authorize('ADMIN'),
  controller.getCompanyById,
);
companiesRouter.post(
  '/companies',
  authenticate,
  authorize('ADMIN'),
  controller.createCompany,
);
companiesRouter.post(
  '/companies/onboarding',
  authenticate,
  authorize('ADMIN'),
  controller.createCompanyWithOwner,
);
companiesRouter.put(
  '/companies/:id',
  authenticate,
  authorize('ADMIN'),
  controller.updateCompany,
);
companiesRouter.patch(
  '/companies/:id/status',
  authenticate,
  authorize('ADMIN'),
  controller.updateCompanyStatus,
);

companiesRouter.get(
  '/companies/:companyId/users',
  authenticate,
  authorize('ADMIN'),
  controller.listUsersByCompany,
);
companiesRouter.post(
  '/companies/:companyId/users',
  authenticate,
  authorize('ADMIN'),
  controller.createUser,
);
companiesRouter.put(
  '/users/:id',
  authenticate,
  authorize('ADMIN'),
  controller.updateUser,
);
companiesRouter.patch(
  '/users/:id/status',
  authenticate,
  authorize('ADMIN'),
  controller.updateUserStatus,
);

companiesRouter.get(
  '/company/settings',
  authenticate,
  authorize('OWNER'),
  controller.getOwnCompanySettings,
);
companiesRouter.put(
  '/company/settings',
  authenticate,
  authorize('OWNER'),
  controller.updateOwnCompanySettings,
);

companiesRouter.get('/company/team', authenticate, authorize('OWNER'), controller.listOwnTeam);
companiesRouter.post('/company/team', authenticate, authorize('OWNER'), controller.createOwnEmployee);
companiesRouter.put('/company/team/:id', authenticate, authorize('OWNER'), controller.updateOwnEmployee);
companiesRouter.patch('/company/team/:id/status', authenticate, authorize('OWNER'), controller.updateOwnEmployeeStatus);
