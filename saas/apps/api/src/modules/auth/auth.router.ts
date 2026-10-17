import { Router } from 'express';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { authenticate, authorize } from './auth.middleware';

const repository = new AuthRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

export const authRouter = Router();

authRouter.post('/register', authenticate, authorize('ADMIN'), (request, response, next) => {
  if (request.auth?.companyId) { response.status(403).json({ error: 'FORBIDDEN' }); return; }
  next();
}, controller.register);
authRouter.post('/login', controller.login);
