import type { NextFunction, Request, Response } from 'express';

import { audit } from './audit';
import { hashIp } from './request-context';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  action: string;
  windowMs: number;
  max: number;
  key: (request: Request) => string;
  message: string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return (request: Request, response: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = options.key(request);
    const current = entries.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

    if (entry.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      response.setHeader('Retry-After', retryAfterSeconds.toString());
      audit(options.action, {
        requestId: request.requestId,
        userId: request.auth?.userId,
        companyId: request.auth?.companyId,
        ipHash: hashIp(request.ip),
        result: 'BLOCKED',
      });
      response.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
        retryAfterSeconds,
      });
      return;
    }

    entry.count += 1;
    entries.set(key, entry);
    next();
  };
}

export function ipRateLimitKey(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown-ip';
}

export function authenticatedUserRateLimitKey(request: Request): string {
  return request.auth?.userId ?? ipRateLimitKey(request);
}
