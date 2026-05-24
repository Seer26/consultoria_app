import { Router } from 'express';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

const repository = new AuthRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

export const authRouter = Router();

authRouter.post('/register', controller.register);
authRouter.post('/login', controller.login);
