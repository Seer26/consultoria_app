import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { StrategyController } from './strategy.controller';
import { StrategyRepository } from './strategy.repository';
import { StrategyService } from './strategy.service';

const controller = new StrategyController(new StrategyService(new StrategyRepository()));
export const strategyRouter = Router();
strategyRouter.use(authenticate);
strategyRouter.get('/strategy', controller.get);
strategyRouter.get('/strategy/assignees', controller.assignees);
strategyRouter.put('/strategy/profile', controller.profile);
strategyRouter.post('/strategy/objectives', controller.createObjective);
strategyRouter.put('/strategy/objectives/:id', controller.updateObjective);
strategyRouter.post('/strategy/objectives/:objectiveId/goals', controller.createGoal);
strategyRouter.put('/strategy/goals/:id', controller.updateGoal);
strategyRouter.post('/strategy/swot', controller.createSwot);
strategyRouter.put('/strategy/swot/:id', controller.updateSwot);
strategyRouter.delete('/strategy/swot/:id', controller.deleteSwot);
