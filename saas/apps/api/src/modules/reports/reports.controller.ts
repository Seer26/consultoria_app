import type { Request, Response } from 'express';

import { writePlanLimitResponse } from '../entitlements/entitlements.middleware';
import { ReportsService } from './reports.service';

export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  private getParam(request: Request, key: string): string {
    const value = request.params[key];
    return Array.isArray(value) ? value[0] : value;
  }

  listResearchReports = (request: Request, response: Response): void => {
    try {
      const result = this.service.listResearchReports(request.auth!);
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getExecutiveResearchReport = (request: Request, response: Response): void => {
    try {
      const result = this.service.getExecutiveResearchReport(
        request.auth!,
        this.getParam(request, 'submissionId'),
      );
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getExecutiveResearchReportPdf = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.generateExecutiveResearchPdf(
        request.auth!,
        this.getParam(request, 'submissionId'),
      );

      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      response.status(200).send(result.buffer);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  private handleError(error: unknown, response: Response): void {
    if (writePlanLimitResponse(error, response)) {
      return;
    }

    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    const statusCode = (() => {
      switch (code) {
        case 'FORBIDDEN':
          return 403;
        case 'USER_NOT_FOUND':
        case 'REPORT_NOT_FOUND':
          return 404;
        case 'REPORT_NOT_AVAILABLE':
          return 409;
        case 'INACTIVE_USER':
          return 409;
        case 'REPORT_PDF_GENERATION_FAILED':
          return 500;
        default:
          return 500;
      }
    })();

    response.status(statusCode).json({ error: code });
  }
}
