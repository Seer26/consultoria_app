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

actionPlanRouter.get('/action-plan/assignees', controller.listAssignees);
actionPlanRouter.get('/action-plan/tasks', controller.listTasks);
actionPlanRouter.get('/action-plan/tasks/:id', controller.getTaskById);
actionPlanRouter.post('/action-plan/tasks', controller.createTask);
actionPlanRouter.put('/action-plan/tasks/:id', controller.updateTask);
actionPlanRouter.patch('/action-plan/tasks/:id/status', controller.updateTaskStatus);
