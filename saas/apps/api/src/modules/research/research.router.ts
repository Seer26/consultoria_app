import { Router } from 'express';

import { ActionPlanRepository } from '../action-plan/action-plan.repository';
import { ActionPlanService } from '../action-plan/action-plan.service';
import { authenticate } from '../auth/auth.middleware';
import { ResearchController } from './research.controller';
import { ResearchRepository } from './research.repository';
import { ResearchService } from './research.service';

const repository = new ResearchRepository();
const actionPlanRepository = new ActionPlanRepository();
const actionPlanService = new ActionPlanService(actionPlanRepository);
const service = new ResearchService(repository, actionPlanService);
const controller = new ResearchController(service);

export const researchRouter = Router();

researchRouter.use(authenticate);

researchRouter.post('/research/submissions', controller.createSubmission);
researchRouter.post('/research/submissions/:id/answers', controller.addAnswer);
researchRouter.post('/research/submissions/:id/complete', controller.completeSubmission);
researchRouter.put('/research/submissions/:id/diagnosis/review', controller.reviewDiagnosis);
researchRouter.post('/research/submissions/:id/diagnosis/approve', controller.approveDiagnosis);
researchRouter.post('/research/submissions/:id/diagnosis/publish', controller.publishDiagnosis);
researchRouter.post('/research/submissions/:id/generate-action-plan', controller.generateActionPlan);
researchRouter.get('/research/submissions', controller.listSubmissions);
researchRouter.get('/research/submissions/:id', controller.getSubmissionById);
