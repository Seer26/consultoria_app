import type { Request, Response } from 'express';

import { writePlanLimitResponse } from '../entitlements/entitlements.middleware';
import { CompaniesService } from './companies.service';

export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  private getParam(request: Request, key: string): string {
    const value = request.params[key];
    return Array.isArray(value) ? value[0] : value;
  }

  listCompanies = async (_request: Request, response: Response): Promise<void> => {
    try {
      response.status(200).json(await this.service.listCompanies());
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getCompanyById = async (request: Request, response: Response): Promise<void> => {
    try {
      response.status(200).json(
        await this.service.getCompanyById(this.getParam(request, 'id')),
      );
    } catch (error) {
      this.handleError(error, response);
    }
  };

  createCompany = async (request: Request, response: Response): Promise<void> => {
    try {
      response.status(201).json(await this.service.createCompany(request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  createCompanyWithOwner = async (request: Request, response: Response): Promise<void> => {
    try {
      response.status(201).json(await this.service.createCompanyWithOwner(request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateCompany = async (request: Request, response: Response): Promise<void> => {
    try {
      response
        .status(200)
        .json(await this.service.updateCompany(this.getParam(request, 'id'), request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateCompanyStatus = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    try {
      response
        .status(200)
        .json(await this.service.updateCompanyStatus(
          this.getParam(request, 'id'),
          request.body,
        ));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  listUsersByCompany = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    try {
      response
        .status(200)
        .json(await this.service.listUsersByCompany(this.getParam(request, 'companyId')));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  createUser = async (request: Request, response: Response): Promise<void> => {
    try {
      response
        .status(201)
        .json(await this.service.createUser(this.getParam(request, 'companyId'), request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateUser = async (request: Request, response: Response): Promise<void> => {
    try {
      response
        .status(200)
        .json(await this.service.updateUser(this.getParam(request, 'id'), request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateUserStatus = async (request: Request, response: Response): Promise<void> => {
    try {
      response
        .status(200)
        .json(await this.service.updateUserStatus(
          this.getParam(request, 'id'),
          request.body,
        ));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getOwnCompanySettings = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    try {
      response.status(200).json(
        await this.service.getOwnCompanySettings(request.auth!),
      );
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateOwnCompanySettings = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    try {
      response
        .status(200)
        .json(await this.service.updateOwnCompanySettings(
          request.auth!,
          request.body ?? {},
        ));
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
        case 'INVALID_COMPANY_NAME':
        case 'INVALID_COMPANY_SLUG':
        case 'INVALID_USER_PAYLOAD':
        case 'INVALID_OWNER_PAYLOAD':
        case 'INVALID_EMAIL':
        case 'INVALID_ROLE':
        case 'INVALID_STATUS':
        case 'PASSWORD_REQUIRED':
        case 'PASSWORD_TOO_SHORT':
        case 'WEAK_PASSWORD':
        case 'COMPANY_ID_REQUIRED':
        case 'INVALID_COMPANY_USER_ROLE':
          return 400;
        case 'COMPANY_NOT_FOUND':
        case 'USER_NOT_FOUND':
          return 404;
        case 'EMAIL_ALREADY_IN_USE':
          return 409;
        case 'FORBIDDEN':
          return 403;
        default:
          return 500;
      }
    })();

    if (code === 'WEAK_PASSWORD') {
      response.status(statusCode).json({
        error: code,
        message: 'Use ao menos 8 caracteres, evite somente numeros, seu email e senhas comuns.',
      });
      return;
    }
    response.status(statusCode).json({ error: code });
  }
}
