import type { Request, Response } from 'express';

import { isAiDiagnosisError } from './ai-diagnosis.errors';
import { AiDiagnosisService } from './ai-diagnosis.service';

export class AiDiagnosisController {
  constructor(private readonly service: AiDiagnosisService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.execute(request.body);
      response.status(200).json(result);
    } catch (error) {
      if (isAiDiagnosisError(error)) {
        response.status(error.statusCode).json({
          error: error.code,
          message: error.message,
        });
        return;
      }

      response.status(500).json({
        error: 'UNKNOWN_ERROR',
        message: 'Erro inesperado ao processar o diagnostico.',
      });
    }
  };
}
