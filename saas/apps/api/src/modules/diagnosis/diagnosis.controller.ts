import type { Request, Response } from 'express';

import { DiagnosisService } from './diagnosis.service';

export class DiagnosisController {
  constructor(private readonly service: DiagnosisService) {}

  getQuestionnaire = (_request: Request, response: Response): void => {
    response.json(this.service.getQuestionnaire());
  };

  submit = (request: Request, response: Response): void => {
    const result = this.service.submit(request.body);
    response.status(201).json(result);
  };
}
