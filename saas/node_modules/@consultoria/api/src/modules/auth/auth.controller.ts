import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.register(request.body);
      response.status(201).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  login = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.login(request.body);
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
        case 'INVALID_ROLE':
        case 'COMPANY_ID_REQUIRED':
          return 400;
        case 'EMAIL_ALREADY_IN_USE':
          return 409;
        case 'INVALID_CREDENTIALS':
          return 401;
        default:
          return 500;
      }
    })();

    response.status(statusCode).json({ error: code });
  }
}
