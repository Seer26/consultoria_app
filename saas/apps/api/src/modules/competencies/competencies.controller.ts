import type { Request, Response } from 'express';

import { CompetenciesService } from './competencies.service';
import type { CompetencyAssessmentStatus, CompetencyStatus, CreateCompanyCompetencyInput, SaveCompetencyItemInput, UpdateCompanyCompetencyInput } from './competencies.types';

export class CompetenciesController {
  constructor(private readonly service: CompetenciesService) {}

  listCatalog = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.listCatalog(request.auth!, this.param(request, 'companyId'),
      { status: this.query(request, 'status') as CompetencyStatus | undefined }));
  };

  createCompetency = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.createCompanyCompetency(request.auth!, this.param(request, 'companyId'),
      this.body(request, ['name', 'description', 'category']) as unknown as CreateCompanyCompetencyInput), 201);
  };

  updateCompetency = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.updateCompanyCompetency(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'competencyId'), this.body(request, ['name', 'description', 'category']) as UpdateCompanyCompetencyInput));
  };

  deactivateCompetency = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.deactivateCompanyCompetency(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'competencyId')));
  };

  startOrResume = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.startOrResumeAssessment(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'userId')), 201);
  };

  listAssessments = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.listCompanyAssessments(request.auth!, this.param(request, 'companyId'), {
      userId: this.query(request, 'userId'), status: this.query(request, 'status') as CompetencyAssessmentStatus | undefined,
    }));
  };

  getAssessment = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.getAdminAssessment(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'assessmentId')));
  };

  saveItem = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.saveItem(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'assessmentId'), this.param(request, 'competencyId'),
      this.body(request, ['evidenceStatus', 'level', 'observation', 'expectedVersion']) as unknown as SaveCompetencyItemInput));
  };

  removeItem = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.removeItem(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'assessmentId'), this.param(request, 'competencyId'), this.query(request, 'expectedVersion')));
  };

  complete = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.completeAssessment(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'assessmentId')));
  };

  getHistory = async (request: Request, response: Response): Promise<void> => {
    await this.respond(response, () => this.service.getHistory(request.auth!, this.param(request, 'companyId'),
      this.param(request, 'userId')));
  };

  private param(request: Request, key: string): string {
    const value = request.params[key];
    if (typeof value !== 'string' || !value.trim()) throw new Error('COMPETENCIES_INVALID_INPUT');
    return value;
  }

  private query(request: Request, key: string): string | undefined {
    const value = request.query[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !value.trim()) throw new Error('COMPETENCIES_INVALID_FILTER');
    return value;
  }

  private body(request: Request, allowed: string[]): Record<string, unknown> {
    const body: unknown = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some(key => !allowed.includes(key))) throw new Error('COMPETENCIES_INVALID_INPUT');
    return body as Record<string, unknown>;
  }

  private async respond(response: Response, operation: () => Promise<unknown>, successStatus = 200): Promise<void> {
    try {
      response.status(successStatus).json(await operation());
    } catch (error) {
      // SQL detail/constraint names never cross the HTTP boundary.
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        response.status(409).json({ error: 'COMPETENCIES_DUPLICATE_ACTIVE_NAME' });
        return;
      }
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      const statuses: Record<string, number> = {
        COMPETENCIES_ITEM_CONFLICT: 409, COMPETENCIES_PRECONDITION_REQUIRED: 428,
        COMPETENCIES_INVALID_INPUT: 400, COMPETENCIES_INVALID_FILTER: 400,
        COMPETENCIES_INVALID_STATUS: 400, COMPETENCIES_INVALID_USER: 400,
        COMPETENCIES_INVALID_ITEM: 400, COMPETENCIES_ITEMS_REQUIRED: 400,
        FORBIDDEN: 403, COMPETENCIES_ADMIN_REQUIRED: 403, COMPETENCIES_SYSTEM_IMMUTABLE: 403,
        COMPANY_NOT_FOUND: 404, USER_NOT_FOUND: 404,
        COMPETENCIES_ASSESSMENT_NOT_FOUND: 404, COMPETENCIES_COMPETENCY_NOT_FOUND: 404,
        INACTIVE_USER: 409, COMPETENCIES_INACTIVE: 409,
        COMPETENCIES_ASSESSMENT_COMPLETED: 409, COMPETENCIES_ASSESSMENT_CONFLICT: 409,
      };
      response.status(statuses[code] ?? 500).json({ error: statuses[code] ? code : 'INTERNAL_SERVER_ERROR' });
    }
  }
}
