import { Router } from 'express';

import { authenticate, authorize } from '../auth/auth.middleware';
import { DiagnosisController } from './diagnosis.controller';
import { DiagnosisRepository } from './diagnosis.repository';
import { DiagnosisService } from './diagnosis.service';

const repository = new DiagnosisRepository();
const service = new DiagnosisService(repository);
const controller = new DiagnosisController(service);

export const diagnosisRouter = Router();

diagnosisRouter.get(
  '/questionnaires/default',
  authenticate,
  authorize('ADMIN', 'OWNER', 'EMPLOYEE'),
  controller.getQuestionnaire,
);
diagnosisRouter.post(
  '/submissions',
  authenticate,
  authorize('ADMIN', 'OWNER', 'EMPLOYEE'),
  (_request, response) => {
    response.status(410).json({ error: 'LEGACY_DIAGNOSIS_DISABLED' });
  },
);
