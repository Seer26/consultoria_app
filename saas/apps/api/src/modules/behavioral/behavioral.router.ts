import { Router } from 'express';

import { authenticate, authorize } from '../auth/auth.middleware';
import { BehavioralController } from './behavioral.controller';
import { BehavioralRepository } from './behavioral.repository';
import { BehavioralService } from './behavioral.service';

const controller = new BehavioralController(new BehavioralService(new BehavioralRepository()));
export const behavioralRouter = Router();

behavioralRouter.use(authenticate);

behavioralRouter.post('/assessments/current', authorize('OWNER', 'EMPLOYEE'), controller.startOrResume);
behavioralRouter.get('/assessments/:assessmentId/questions', authorize('OWNER', 'EMPLOYEE'), controller.getQuestions);
behavioralRouter.put('/assessments/:assessmentId/answers/:questionId', authorize('OWNER', 'EMPLOYEE'), controller.saveAnswer);
behavioralRouter.post('/assessments/:assessmentId/complete', authorize('OWNER', 'EMPLOYEE'), controller.complete);

behavioralRouter.get('/companies/:companyId/assessments', authorize('ADMIN'), controller.listCompanyAssessments);
behavioralRouter.get('/companies/:companyId/users/:userId/history', authorize('ADMIN'), controller.getHistory);
behavioralRouter.get('/companies/:companyId/assessments/:assessmentId/result', authorize('ADMIN'), controller.getAdminResult);
