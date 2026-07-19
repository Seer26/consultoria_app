import type { NextFunction, Request, Response } from 'express';

import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import type { UserRole } from './auth.types';
import { audit } from '../../shared/audit';
import { hashIp } from '../../shared/request-context';
import { legalService } from '../legal/legal.service';

const repository = new AuthRepository();
const service = new AuthService(repository);

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'TOKEN_REQUIRED' });
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length);

  let payload: ReturnType<AuthService['verifyToken']> | undefined;
  try {
    payload = service.verifyToken(token);
    request.auth = await service.resolveAuthenticatedUser(payload);
    const legalRoute = request.originalUrl.startsWith('/legal/');
    if (!legalRoute && await legalService.hasPending(request.auth)) {
      response.status(428).json({
        error: 'LEGAL_ACCEPTANCE_REQUIRED',
        pending: await legalService.listPending(request.auth),
      });
      return;
    }
    next();
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INVALID_TOKEN';
    if (code === 'INACTIVE_USER' || code === 'INACTIVE_COMPANY') {
      audit(code === 'INACTIVE_USER' ? 'inactive_user_blocked' : 'inactive_company_blocked', {
        requestId: request.requestId,
        userId: payload?.userId,
        companyId: payload?.companyId,
        ipHash: hashIp(request.ip),
        result: 'BLOCKED',
      });
    }
    response.status(401).json({
      error: [
        'INACTIVE_USER',
        'INACTIVE_COMPANY',
        'SESSION_REVOKED',
        'INVALID_COMPANY_MEMBERSHIP',
      ].includes(code) ? code : 'INVALID_TOKEN',
    });
  }
}

export function authorize(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.auth) {
      response.status(401).json({ error: 'TOKEN_REQUIRED' });
      return;
    }

    if (!roles.includes(request.auth.role)) {
      response.status(403).json({ error: 'FORBIDDEN' });
      return;
    }

    next();
  };
}
