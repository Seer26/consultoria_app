import { Router } from 'express';

import { authenticate, authorize, authorizePermission } from '../auth/auth.middleware';
import { AuthRepository } from '../auth/auth.repository';
import { createEmailService } from '../auth/email.service';
import { AdminsController } from './admins.controller';
import { AdminsRepository } from './admins.repository';
import { AdminsService } from './admins.service';
import { ADMIN_CREATE_PERMISSION } from './admins.types';

const repository = new AdminsRepository();
const authRepository = new AuthRepository();
const service = new AdminsService(repository, authRepository, createEmailService());
const controller = new AdminsController(service);

export const adminsRouter = Router();

const requireAdminCreate = [
  authenticate,
  authorize('ADMIN'),
  authorizePermission(ADMIN_CREATE_PERMISSION),
];

adminsRouter.get('/admins', ...requireAdminCreate, controller.listAdmins);
adminsRouter.post('/admins', ...requireAdminCreate, controller.createAdmin);
adminsRouter.patch('/admins/:id/status', ...requireAdminCreate, controller.updateAdminStatus);
adminsRouter.put('/admins/:id/permissions', ...requireAdminCreate, controller.updateAdminPermissions);
adminsRouter.post('/admins/:id/invite', ...requireAdminCreate, controller.resendAdminInvite);
