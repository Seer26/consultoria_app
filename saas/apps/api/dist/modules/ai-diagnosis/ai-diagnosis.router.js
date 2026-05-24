import { Router } from 'express';
import { AiDiagnosisClient } from './ai-diagnosis.client';
import { AiDiagnosisController } from './ai-diagnosis.controller';
import { AiDiagnosisService } from './ai-diagnosis.service';
const client = new AiDiagnosisClient();
const service = new AiDiagnosisService(client);
const controller = new AiDiagnosisController(service);
export const aiDiagnosisRouter = Router();
aiDiagnosisRouter.post('/', controller.create);
