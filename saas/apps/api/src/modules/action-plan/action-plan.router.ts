import { Router } from 'express';

import { authenticate } from '../auth/auth.middleware';
import { ActionPlanController } from './action-plan.controller';
import { ActionPlanRepository } from './action-plan.repository';
import { ActionPlanService } from './action-plan.service';

const repository = new ActionPlanRepository();
const service = new ActionPlanService(repository);
const controller = new ActionPlanController(service);

export const actionPlanRouter = Router();

actionPlanRouter.use(authenticate);

actionPlanRouter.get('/action-plan/tasks', controller.listTasks);
actionPlanRouter.get('/action-plan/tasks/:id', controller.getTaskById);
actionPlanRouter.post('/action-plan/tasks', controller.createTask);
actionPlanRouter.put('/action-plan/tasks/:id', controller.updateTask);
actionPlanRouter.patch('/action-plan/tasks/:id/status', controller.updateTaskStatus);

actionPlanRouter.get('/action-plan/plans', controller.listPlans);
actionPlanRouter.get('/action-plan/plans/:id', controller.getPlan);
actionPlanRouter.post('/action-plan/plans', controller.createPlan);
actionPlanRouter.put('/action-plan/plans/:id', controller.updatePlan);
actionPlanRouter.get('/action-plan/dashboard', controller.dashboard);
actionPlanRouter.get('/action-plan/employees', controller.employees);
actionPlanRouter.get('/action-plan/members', controller.members);
actionPlanRouter.get('/action-plan/tasks/:id/evidence', controller.getEvidence);
actionPlanRouter.post('/action-plan/tasks/:id/evidence', controller.addEvidence);
actionPlanRouter.get('/action-plan/tasks/:id/history', controller.getHistory);
