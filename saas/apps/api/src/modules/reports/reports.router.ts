import { Router } from 'express';

import { authenticate } from '../auth/auth.middleware';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';
import { env } from '../../config/env';
import { authenticatedUserRateLimitKey, createRateLimiter } from '../../shared/rate-limit';

const repository = new ReportsRepository();
const service = new ReportsService(repository);
const controller = new ReportsController(service);

export const reportsRouter = Router();

const pdfRateLimit = createRateLimiter({
  action: 'pdf_rate_limit_blocked',
  windowMs: env.pdfRateLimitWindowMs,
  max: env.pdfRateLimitMax,
  key: authenticatedUserRateLimitKey,
  message: 'Muitas geracoes de PDF em sequencia. Aguarde um momento e tente novamente.',
});

reportsRouter.use(authenticate);

reportsRouter.get('/reports/research', controller.listResearchReports);
reportsRouter.get(
  '/reports/research/:submissionId/executive/pdf',
  pdfRateLimit,
  controller.getExecutiveResearchReportPdf,
);
reportsRouter.get(
  '/reports/research/:submissionId/executive',
  controller.getExecutiveResearchReport,
);
