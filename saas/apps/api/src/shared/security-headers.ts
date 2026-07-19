import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';

export function securityHeaders(_request: Request, response: Response, next: NextFunction): void {
  response.removeHeader('X-Powered-By');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  );
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (env.nodeEnv === 'production') {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}
