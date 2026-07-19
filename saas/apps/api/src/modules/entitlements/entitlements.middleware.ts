import type { NextFunction, Request, Response } from 'express';

import { EntitlementsRepository } from './entitlements.repository';
import {
  EntitlementsService,
  isPlanLimitError,
} from './entitlements.service';
import type { PlanFeature } from './entitlements.types';

const service = new EntitlementsService(new EntitlementsRepository());

export function writePlanLimitResponse(error: unknown, response: Response): boolean {
  if (!isPlanLimitError(error)) {
    return false;
  }

  response.status(402).json({
    error: error.message,
    feature: error.feature,
    limit: error.limit,
    used: error.used,
    requested: error.requested,
    remaining: Math.max(error.limit - error.used, 0),
  });
  return true;
}

export function requireCompanyEntitlement(feature: PlanFeature) {
  return async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = request.auth?.companyId;
      if (!companyId) {
        response.status(400).json({ error: 'COMPANY_ID_REQUIRED' });
        return;
      }

      await service.assertCanUseFeature(companyId, feature);
      next();
    } catch (error) {
      if (writePlanLimitResponse(error, response)) {
        return;
      }

      next(error);
    }
  };
}
