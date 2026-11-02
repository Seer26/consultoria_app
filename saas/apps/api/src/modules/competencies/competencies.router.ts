import { Router } from 'express';

import { authenticate, authorize } from '../auth/auth.middleware';
import { CompetenciesController } from './competencies.controller';
import { CompetenciesRepository } from './competencies.repository';
import { CompetenciesService } from './competencies.service';

const controller = new CompetenciesController(new CompetenciesService(new CompetenciesRepository()));
export const competenciesRouter = Router();

// Keep both guards on each route: this router shares '/' with other role flows.
competenciesRouter.get('/companies/:companyId/competencies', authenticate, authorize('ADMIN'), controller.listCatalog);
competenciesRouter.post('/companies/:companyId/competencies', authenticate, authorize('ADMIN'), controller.createCompetency);
competenciesRouter.patch('/companies/:companyId/competencies/:competencyId', authenticate, authorize('ADMIN'), controller.updateCompetency);
competenciesRouter.post('/companies/:companyId/competencies/:competencyId/deactivate', authenticate, authorize('ADMIN'), controller.deactivateCompetency);
competenciesRouter.post('/companies/:companyId/users/:userId/competency-assessments/current', authenticate, authorize('ADMIN'), controller.startOrResume);
competenciesRouter.get('/companies/:companyId/competency-assessments', authenticate, authorize('ADMIN'), controller.listAssessments);
competenciesRouter.get('/companies/:companyId/competency-assessments/:assessmentId', authenticate, authorize('ADMIN'), controller.getAssessment);
competenciesRouter.put('/companies/:companyId/competency-assessments/:assessmentId/items/:competencyId', authenticate, authorize('ADMIN'), controller.saveItem);
competenciesRouter.delete('/companies/:companyId/competency-assessments/:assessmentId/items/:competencyId', authenticate, authorize('ADMIN'), controller.removeItem);
competenciesRouter.post('/companies/:companyId/competency-assessments/:assessmentId/complete', authenticate, authorize('ADMIN'), controller.complete);
competenciesRouter.get('/companies/:companyId/competency-assessments/:assessmentId/result', authenticate, authorize('ADMIN'), controller.getAssessment);
competenciesRouter.get('/companies/:companyId/users/:userId/competency-assessments/history', authenticate, authorize('ADMIN'), controller.getHistory);
