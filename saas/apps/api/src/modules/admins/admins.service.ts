import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { env } from '../../config/env';
import { dataSource } from '../../database/data-source';
import { audit } from '../../shared/audit';
import { hashIp } from '../../shared/request-context';
import { AuthRepository } from '../auth/auth.repository';
import type { EmailService } from '../auth/email.service';
import { assertPasswordPolicy } from '../auth/password-policy';
import { AdminsRepository } from './admins.repository';
import {
  ADMIN_CREATE_PERMISSION,
  type AdminUserSummary,
  type CreateAdminInput,
  type UpdateAdminPermissionsInput,
  type UpdateAdminStatusInput,
} from './admins.types';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AdminsService {
  constructor(
    private readonly repository: AdminsRepository,
    private readonly authRepository: AuthRepository,
    private readonly emailService?: EmailService,
  ) {}

  async listAdmins(): Promise<AdminUserSummary[]> {
    return this.repository.listAdmins();
  }

  async createAdmin(params: {
    actorUserId: string;
    input: CreateAdminInput;
    requestId?: string;
    ip?: string;
  }): Promise<{ admin: AdminUserSummary; inviteSent: boolean }> {
    const name = params.input.name?.trim() ?? '';
    const email = params.input.email?.trim().toLowerCase() ?? '';
    const rawPassword = params.input.password?.trim() ?? '';
    const grantAdminCreate = params.input.grantAdminCreate === true;

    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error('INVALID_ADMIN_PAYLOAD');
    }

    const useInvite = rawPassword.length === 0;
    if (!useInvite) {
      assertPasswordPolicy(rawPassword, email);
    }

    const passwordHash = useInvite
      ? await bcrypt.hash(randomBytes(32).toString('hex'), 10)
      : await bcrypt.hash(rawPassword, 10);

    const id = randomUUID();
    const now = new Date().toISOString();
    const inviteToken = useInvite ? randomBytes(32).toString('base64url') : null;
    const inviteExpiresInMinutes = Math.max(env.passwordResetTokenTtlMinutes, 1440);

    await dataSource.transaction(async () => {
      const duplicate = await this.repository.findUserByEmail(email);
      if (duplicate) {
        throw new Error('EMAIL_ALREADY_IN_USE');
      }

      await this.repository.insertAdmin({
        id,
        name,
        email,
        passwordHash,
        createdAt: now,
        grantedByUserId: params.actorUserId,
        grantPermission: grantAdminCreate
          ? { id: randomUUID(), permission: ADMIN_CREATE_PERMISSION }
          : undefined,
        inviteTokenRecord: inviteToken
          ? {
              id: randomUUID(),
              tokenHash: hashToken(inviteToken),
              expiresAt: new Date(Date.now() + inviteExpiresInMinutes * 60 * 1000).toISOString(),
              requestedIpHash: hashIp(params.ip) ?? null,
              requestId: params.requestId ?? null,
            }
          : undefined,
      });
    });

    audit('admin_user_created', {
      requestId: params.requestId,
      userId: params.actorUserId,
      ipHash: hashIp(params.ip),
      targetUserId: id,
      grantAdminCreate,
      mode: useInvite ? 'invite' : 'password',
      result: 'SUCCESS',
    });

    if (grantAdminCreate) {
      audit('admin_permission_granted', {
        requestId: params.requestId,
        userId: params.actorUserId,
        ipHash: hashIp(params.ip),
        targetUserId: id,
        permission: ADMIN_CREATE_PERMISSION,
        result: 'SUCCESS',
      });
    }

    let inviteSent = false;
    if (inviteToken && this.emailService?.sendAdminInvite) {
      try {
        await this.emailService.sendAdminInvite({
          to: email,
          recipientName: name,
          token: inviteToken,
          expiresInMinutes: inviteExpiresInMinutes,
          requestId: params.requestId,
        });
        inviteSent = true;
      } catch (error) {
        audit('admin_invite_email_failed', {
          requestId: params.requestId,
          userId: params.actorUserId,
          targetUserId: id,
          result: 'ERROR',
          error,
        });
      }
    }

    const admin = await this.repository.findAdminById(id);
    return {
      admin: admin ?? {
        id,
        name,
        email,
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: grantAdminCreate ? [ADMIN_CREATE_PERMISSION] : [],
        createdAt: now,
        updatedAt: now,
      },
      inviteSent,
    };
  }

  async updateAdminStatus(params: {
    actorUserId: string;
    targetUserId: string;
    input: UpdateAdminStatusInput;
    requestId?: string;
    ip?: string;
  }): Promise<AdminUserSummary> {
    const status = params.input.status;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      throw new Error('INVALID_STATUS');
    }

    const updated = await dataSource.transaction(async () => {
      const existing = await this.repository.findAdminById(params.targetUserId);
      if (!existing) {
        throw new Error('ADMIN_NOT_FOUND');
      }

      if (status === 'INACTIVE' && existing.status === 'ACTIVE') {
        const remainingAdmins = await this.repository.countOtherActiveAdmins(existing.id);
        if (remainingAdmins < 1) {
          throw new Error('LAST_AUTHORIZED_ADMIN_PROTECTED');
        }

        if (existing.permissions.includes(ADMIN_CREATE_PERMISSION)) {
          const remainingAuthorized = await this.repository.countOtherActiveAdminsWithPermission(
            existing.id,
            ADMIN_CREATE_PERMISSION,
          );
          if (remainingAuthorized < 1) {
            throw new Error('LAST_AUTHORIZED_ADMIN_PROTECTED');
          }
        }
      }

      const updatedAt = new Date().toISOString();
      await this.repository.updateAdminStatus(existing.id, status, updatedAt);
      return (await this.repository.findAdminById(existing.id))!;
    });

    audit('admin_status_updated', {
      requestId: params.requestId,
      userId: params.actorUserId,
      ipHash: hashIp(params.ip),
      targetUserId: params.targetUserId,
      status,
      result: 'SUCCESS',
    });

    return updated;
  }

  async updateAdminPermissions(params: {
    actorUserId: string;
    targetUserId: string;
    input: UpdateAdminPermissionsInput;
    requestId?: string;
    ip?: string;
  }): Promise<AdminUserSummary> {
    if (typeof params.input.grantAdminCreate !== 'boolean') {
      throw new Error('INVALID_ADMIN_PERMISSION_PAYLOAD');
    }

    const grant = params.input.grantAdminCreate;
    const updated = await dataSource.transaction(async () => {
      const existing = await this.repository.findAdminById(params.targetUserId);
      if (!existing) {
        throw new Error('ADMIN_NOT_FOUND');
      }

      if (!grant && existing.status === 'ACTIVE' && existing.permissions.includes(ADMIN_CREATE_PERMISSION)) {
        const remainingAuthorized = await this.repository.countOtherActiveAdminsWithPermission(
          existing.id,
          ADMIN_CREATE_PERMISSION,
        );
        if (remainingAuthorized < 1) {
          throw new Error('LAST_AUTHORIZED_ADMIN_PROTECTED');
        }
      }

      await this.repository.setUserPermission({
        permissionRowId: randomUUID(),
        userId: existing.id,
        permission: ADMIN_CREATE_PERMISSION,
        grant,
        grantedByUserId: params.actorUserId,
        createdAt: new Date().toISOString(),
      });

      return (await this.repository.findAdminById(existing.id))!;
    });

    audit(grant ? 'admin_permission_granted' : 'admin_permission_revoked', {
      requestId: params.requestId,
      userId: params.actorUserId,
      ipHash: hashIp(params.ip),
      targetUserId: params.targetUserId,
      permission: ADMIN_CREATE_PERMISSION,
      result: 'SUCCESS',
    });

    return updated;
  }

  async resendAdminInvite(params: {
    actorUserId: string;
    targetUserId: string;
    requestId?: string;
    ip?: string;
  }): Promise<{ inviteSent: boolean }> {
    const existing = await this.repository.findAdminById(params.targetUserId);
    if (!existing) {
      throw new Error('ADMIN_NOT_FOUND');
    }
    if (existing.status !== 'ACTIVE') {
      throw new Error('TARGET_ADMIN_INACTIVE');
    }

    const token = randomBytes(32).toString('base64url');
    const now = new Date().toISOString();
    const expiresInMinutes = Math.max(env.passwordResetTokenTtlMinutes, 1440);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    await this.authRepository.createPasswordResetToken({
      id: randomUUID(),
      userId: existing.id,
      tokenHash: hashToken(token),
      createdAt: now,
      expiresAt,
      usedAt: null,
      requestedIpHash: hashIp(params.ip) ?? null,
      requestId: params.requestId ?? null,
      status: 'PENDING',
    });

    let inviteSent = false;
    if (this.emailService?.sendAdminInvite) {
      await this.emailService.sendAdminInvite({
        to: existing.email,
        recipientName: existing.name,
        token,
        expiresInMinutes,
        requestId: params.requestId,
      });
      inviteSent = true;
    }

    audit('admin_invite_resent', {
      requestId: params.requestId,
      userId: params.actorUserId,
      ipHash: hashIp(params.ip),
      targetUserId: existing.id,
      result: inviteSent ? 'SUCCESS' : 'SKIPPED',
    });

    return { inviteSent };
  }
}
