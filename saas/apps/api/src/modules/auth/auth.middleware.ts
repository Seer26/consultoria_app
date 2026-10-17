import type { NextFunction, Request, Response } from 'express';

import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import type { UserRole } from './auth.types';

const repository = new AuthRepository();
const service = new AuthService(repository);

export function authenticate(request: Request, response: Response, next: NextFunction): void {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'TOKEN_REQUIRED' });
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length);

  try {
    const payload = service.verifyToken(token);
    const user = repository.findUserById(payload.userId);
    if (!user || user.status !== 'ACTIVE') {
      response.status(403).json({ error: 'INACTIVE_USER' });
      return;
    }
    request.auth = { userId: user.id, role: user.role, companyId: user.companyId };
    next();
  } catch {
    response.status(401).json({ error: 'INVALID_TOKEN' });
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
