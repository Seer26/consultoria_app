import { Router } from 'express';

import { env } from '../../config/env';
import { metrics } from '../../shared/metrics';
import { authenticate, authorize } from '../auth/auth.middleware';

export const operationsRouter = Router();

operationsRouter.get(
  '/operations/metrics',
  authenticate,
  authorize('ADMIN'),
  (_request, response) => {
    if (!env.enableInternalMetrics) {
      response.status(404).json({ error: 'METRICS_DISABLED' });
      return;
    }
    response.status(200).json({
      environment: env.nodeEnv,
      metrics: metrics.snapshot(),
      timestamp: new Date().toISOString(),
    });
  },
);
