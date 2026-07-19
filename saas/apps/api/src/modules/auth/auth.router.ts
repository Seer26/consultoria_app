import { Router } from 'express';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { createEmailService } from './email.service';
import { env } from '../../config/env';
import { createRateLimiter, ipRateLimitKey } from '../../shared/rate-limit';

const repository = new AuthRepository();
const service = new AuthService(repository, createEmailService());
const controller = new AuthController(service);

export const authRouter = Router();

const loginRateLimit = createRateLimiter({
  action: 'login_rate_limit_blocked',
  windowMs: env.loginRateLimitWindowMs,
  max: env.loginRateLimitMax,
  key: ipRateLimitKey,
  message: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
});
const passwordForgotRateLimit = createRateLimiter({
  action: 'password_reset_rate_limit_blocked',
  windowMs: env.passwordForgotRateLimitWindowMs,
  max: env.passwordForgotRateLimitMax,
  key: ipRateLimitKey,
  message: 'Muitas solicitacoes de recuperacao. Aguarde e tente novamente.',
});

authRouter.post('/register', controller.register);
authRouter.post('/login', loginRateLimit, controller.login);
authRouter.post('/password/forgot', passwordForgotRateLimit, controller.forgotPassword);
authRouter.post('/password/reset', controller.resetPassword);
