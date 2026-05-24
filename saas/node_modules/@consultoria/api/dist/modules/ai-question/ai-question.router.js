import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { AiQuestionController } from './ai-question.controller';
import { AiQuestionService } from './ai-question.service';
const service = new AiQuestionService();
const controller = new AiQuestionController(service);
export const aiQuestionRouter = Router();
aiQuestionRouter.post('/next-question', authenticate, controller.create);
