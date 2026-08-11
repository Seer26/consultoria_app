import type { Request, Response } from 'express';

import { audit } from '../../shared/audit';
import { AuthService } from './auth.service';
import { hashIp } from '../../shared/request-context';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.register(request.body);
      response.status(201).json(result);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      this.handleError(error, response);
    }
  };

  login = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.login(request.body);
      audit('login_succeeded', {
        requestId: request.requestId,
        userId: result.user.id,
        companyId: result.user.companyId,
        ipHash: hashIp(request.ip),
        result: 'SUCCESS',
      });
      response.status(200).json(result);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      audit('login_refused', {
        requestId: request.requestId,
        ipHash: hashIp(request.ip),
        reason: code,
        result: 'REJECTED',
      });
      this.handleError(error, response);
    }
  };

  forgotPassword = async (request: Request, response: Response): Promise<void> => {
    const result = await this.service.requestPasswordReset({
      email: request.body?.email,
      requestId: request.requestId,
      ip: request.ip,
    });
    response.status(202).json(result);
  };

  resetPassword = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.resetPassword({
        token: request.body?.token,
        newPassword: request.body?.newPassword,
        requestId: request.requestId,
        ip: request.ip,
      });
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  changePassword = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.changePassword({
        auth: request.auth!,
        currentPassword: request.body?.currentPassword,
        newPassword: request.body?.newPassword,
        requestId: request.requestId,
        ip: request.ip,
      });
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  private handleError(error: unknown, response: Response): void {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    const statusCode = (() => {
      switch (code) {
        case 'INVALID_REGISTER_PAYLOAD':
        case 'PASSWORD_TOO_SHORT':
        case 'WEAK_PASSWORD':
        case 'CURRENT_PASSWORD_INVALID':
        case 'PASSWORD_UNCHANGED':
        case 'INVALID_ROLE':
        case 'COMPANY_ID_REQUIRED':
          return 400;
        case 'PUBLIC_REGISTRATION_DISABLED':
          return 403;
        case 'EMAIL_ALREADY_IN_USE':
          return 409;
        case 'INVALID_CREDENTIALS':
          return 401;
        case 'INACTIVE_USER':
        case 'INACTIVE_COMPANY':
          return 403;
        case 'COMPANY_NOT_FOUND':
          return 404;
        case 'INVALID_OR_EXPIRED_RESET_TOKEN':
          return 400;
        default:
          return 500;
      }
    })();

    if (code === 'WEAK_PASSWORD') {
      response.status(statusCode).json({
        error: code,
        message: 'Use ao menos 8 caracteres, evite somente numeros, seu email e senhas comuns.',
      });
      return;
    }
    response.status(statusCode).json({ error: code });
  }
}
