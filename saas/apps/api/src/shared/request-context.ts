import { createHash, randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { logger } from './logger';
import { metrics } from './metrics';
import { env } from '../config/env';
import { operationalAlert } from './alerts';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/;

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  const received = request.header('X-Request-ID')?.trim();
  const requestId = received && REQUEST_ID_PATTERN.test(received) ? received : randomUUID();
  const startedAt = Date.now();

  request.requestId = requestId;
  response.setHeader('X-Request-ID', requestId);

  response.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    metrics.observeRequest(response.statusCode, durationMs);
    logger.info('http.request_completed', {
      requestId,
      method: request.method,
      route: request.route?.path ?? request.path,
      statusCode: response.statusCode,
      durationMs,
      userId: request.auth?.userId,
      companyId: request.auth?.companyId,
      role: request.auth?.role,
      environment: env.appEnv,
    });
    if (response.statusCode >= 500) {
      operationalAlert('api_5xx', 'error', {
        requestId,
        method: request.method,
        route: request.route?.path ?? request.path,
        statusCode: response.statusCode,
      });
    }
  });

  next();
}

export function hashIp(ip: string | undefined): string | undefined {
  if (!ip) {
    return undefined;
  }

  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}
