import type { Request, Response } from 'express';

import { CompaniesService } from './companies.service';

export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  private getParam(request: Request, key: string): string {
    const value = request.params[key];
    return Array.isArray(value) ? value[0] : value;
  }

  listCompanies = (request: Request, response: Response): void => {
    try {
      response.status(200).json(this.service.listCompanies());
    } catch (error) {
      this.handleError(error, response);
    }
  };

  getCompanyById = (request: Request, response: Response): void => {
    try {
      response.status(200).json(this.service.getCompanyById(this.getParam(request, 'id')));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  createCompany = (request: Request, response: Response): void => {
    try {
      response.status(201).json(this.service.createCompany(request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateCompany = (request: Request, response: Response): void => {
    try {
      response
        .status(200)
        .json(this.service.updateCompany(this.getParam(request, 'id'), request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateCompanyStatus = (request: Request, response: Response): void => {
    try {
      response
        .status(200)
        .json(this.service.updateCompanyStatus(this.getParam(request, 'id'), request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  listUsersByCompany = (request: Request, response: Response): void => {
    try {
      response
        .status(200)
        .json(this.service.listUsersByCompany(this.getParam(request, 'companyId')));
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

  updateUserStatus = (request: Request, response: Response): void => {
    try {
      response
        .status(200)
        .json(this.service.updateUserStatus(this.getParam(request, 'id'), request.body));
    } catch (error) {
      this.handleError(error, response);
    }
  };

  private handleError(error: unknown, response: Response): void {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    const statusCode = (() => {
      switch (code) {
        case 'INVALID_COMPANY_NAME':
        case 'INVALID_COMPANY_SLUG':
        case 'INVALID_USER_PAYLOAD':
        case 'INVALID_EMAIL':
        case 'INVALID_ROLE':
        case 'INVALID_STATUS':
        case 'PASSWORD_REQUIRED':
        case 'PASSWORD_TOO_SHORT':
        case 'COMPANY_ID_REQUIRED':
        case 'INVALID_COMPANY_USER_ROLE':
          return 400;
        case 'COMPANY_NOT_FOUND':
        case 'USER_NOT_FOUND':
          return 404;
        case 'EMAIL_ALREADY_IN_USE':
          return 409;
        default:
          return 500;
      }
    })();

    response.status(statusCode).json({ error: code });
  }
}
