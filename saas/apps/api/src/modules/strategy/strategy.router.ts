import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware';
import { StrategyController } from './strategy.controller';
import { StrategyRepository } from './strategy.repository';
import { StrategyService } from './strategy.service';

const controller = new StrategyController(new StrategyService(new StrategyRepository()));
export const strategyRouter = Router();
strategyRouter.use(authenticate);
strategyRouter.get('/strategy', controller.get);
strategyRouter.get('/strategy/assignees', controller.assignees);
strategyRouter.put('/strategy/profile', authorize('ADMIN'), controller.profile);
strategyRouter.post('/strategy/objectives', authorize('ADMIN'), controller.createObjective);
strategyRouter.put('/strategy/objectives/:id', authorize('ADMIN'), controller.updateObjective);
strategyRouter.post('/strategy/objectives/:objectiveId/goals', authorize('ADMIN'), controller.createGoal);
strategyRouter.put('/strategy/goals/:id', authorize('ADMIN'), controller.updateGoal);
strategyRouter.post('/strategy/swot', authorize('ADMIN'), controller.createSwot);
strategyRouter.put('/strategy/swot/:id', authorize('ADMIN'), controller.updateSwot);
strategyRouter.delete('/strategy/swot/:id', authorize('ADMIN'), controller.deleteSwot);
