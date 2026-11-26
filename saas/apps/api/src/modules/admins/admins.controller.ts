import type { Request, Response } from 'express';

import { AdminsService } from './admins.service';

export class AdminsController {
  constructor(private readonly service: AdminsService) {}

  listAdmins = async (_request: Request, response: Response): Promise<void> => {
    try {
      const admins = await this.service.listAdmins();
      response.status(200).json(admins);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  createAdmin = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.createAdmin({
        actorUserId: request.auth!.userId,
        input: {
          name: request.body?.name,
          email: request.body?.email,
          password: request.body?.password,
          grantAdminCreate: request.body?.grantAdminCreate,
        },
        requestId: request.requestId,
        ip: request.ip,
      });
      response.status(201).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateAdminStatus = async (request: Request, response: Response): Promise<void> => {
    try {
      const admin = await this.service.updateAdminStatus({
        actorUserId: request.auth!.userId,
        targetUserId: String(request.params.id ?? ''),
        input: { status: request.body?.status },
        requestId: request.requestId,
        ip: request.ip,
      });
      response.status(200).json(admin);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  updateAdminPermissions = async (request: Request, response: Response): Promise<void> => {
    try {
      const admin = await this.service.updateAdminPermissions({
        actorUserId: request.auth!.userId,
        targetUserId: String(request.params.id ?? ''),
        input: { grantAdminCreate: request.body?.grantAdminCreate },
        requestId: request.requestId,
        ip: request.ip,
      });
      response.status(200).json(admin);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  resendAdminInvite = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.service.resendAdminInvite({
        actorUserId: request.auth!.userId,
        targetUserId: String(request.params.id ?? ''),
        requestId: request.requestId,
        ip: request.ip,
      });
      response.status(200).json(result);
    } catch (error) {
      this.handleError(error, response);
    }
  };

  private handleError(error: unknown, response: Response): void {
    const code = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';

    if (
      code === 'INVALID_ADMIN_PAYLOAD' ||
      code === 'INVALID_STATUS' ||
      code === 'INVALID_ADMIN_PERMISSION_PAYLOAD' ||
      code === 'TARGET_ADMIN_INACTIVE' ||
      code.startsWith('PASSWORD_')
    ) {
      response.status(400).json({ error: code });
      return;
    }

    if (code === 'ADMIN_NOT_FOUND') {
      response.status(404).json({ error: code });
      return;
    }

    if (code === 'EMAIL_ALREADY_IN_USE' || code === 'LAST_AUTHORIZED_ADMIN_PROTECTED') {
      response.status(409).json({ error: code });
      return;
    }

    response.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}
