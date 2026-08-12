import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { env } from '../../config/env';
import { audit } from '../../shared/audit';
import { hashIp } from '../../shared/request-context';
import { AuthRepository } from './auth.repository';
import type { EmailService } from './email.service';
import { assertPasswordPolicy } from './password-policy';
import type {
  AuthResponse,
  AuthTokenPayload,
  AuthUserRecord,
  CompanyRecord,
  LoginInput,
  RegisterInput,
  UserRole,
} from './auth.types';

function sanitizeUser(user: AuthUserRecord): AuthResponse['user'] {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    status: user.status,
    department: user.department,
    jobFunction: user.jobFunction,
  };
}

function sanitizeCompany(company: CompanyRecord | null): AuthResponse['company'] {
  if (!company) {
    return null;
  }

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    status: company.status,
    sector: company.sector,
    size: company.size,
  };
}

const PASSWORD_RESET_GENERIC_MESSAGE =
  'Se existir uma conta associada a este e-mail, enviaremos as instrucoes de recuperacao.';

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly emailService?: EmailService,
  ) {}

  async register(_input: RegisterInput): Promise<AuthResponse> {
    throw new Error('PUBLIC_REGISTRATION_DISABLED');
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    if (!input.email?.trim() || !input.password?.trim()) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const user = await this.repository.findUserByEmail(input.email.trim().toLowerCase());

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('INACTIVE_USER');
    }

    if (user.companyId) {
      const company = await this.repository.findCompanyById(user.companyId);
      if (!company) {
        throw new Error('COMPANY_NOT_FOUND');
      }
      if (company.status !== 'ACTIVE') {
        throw new Error('INACTIVE_COMPANY');
      }
    }

    return this.buildAuthResponse(user);
  }

  verifyToken(token: string): AuthTokenPayload {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    return decoded;
  }

  async resolveAuthenticatedUser(payload: AuthTokenPayload): Promise<AuthTokenPayload> {
    const user = await this.repository.findUserById(payload.userId);
    if (!user) {
      throw new Error('INVALID_TOKEN');
    }
    if (user.status !== 'ACTIVE') {
      throw new Error('INACTIVE_USER');
    }
    if (Number(payload.authVersion ?? 0) !== user.authVersion) {
      throw new Error('SESSION_REVOKED');
    }

    if (user.role === 'ADMIN') {
      return {
        userId: user.id,
        role: user.role,
        companyId: user.companyId,
        authVersion: user.authVersion,
      };
    }

    if (!user.companyId) {
      throw new Error('INVALID_COMPANY_MEMBERSHIP');
    }
    const company = await this.repository.findCompanyById(user.companyId);
    if (!company) {
      throw new Error('INVALID_COMPANY_MEMBERSHIP');
    }
    if (company.status !== 'ACTIVE') {
      throw new Error('INACTIVE_COMPANY');
    }

    return {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      authVersion: user.authVersion,
    };
  }

  async requestPasswordReset(input: {
    email?: string;
    requestId?: string;
    ip?: string;
  }): Promise<{ message: string }> {
    const normalizedEmail = input.email?.trim().toLowerCase() ?? '';
    const user = normalizedEmail
      ? await this.repository.findUserByEmail(normalizedEmail)
      : null;

    if (user && user.status === 'ACTIVE') {
      const token = randomBytes(32).toString('base64url');
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + env.passwordResetTokenTtlMinutes * 60 * 1000,
      );
      await this.repository.createPasswordResetToken({
        id: randomUUID(),
        userId: user.id,
        tokenHash: hashResetToken(token),
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        usedAt: null,
        requestedIpHash: hashIp(input.ip) ?? null,
        requestId: input.requestId ?? null,
        status: 'PENDING',
      });

      try {
        if (!this.emailService) {
          throw new Error('EMAIL_SERVICE_UNAVAILABLE');
        }
        await this.emailService.sendPasswordReset({
          to: user.email,
          token,
          expiresInMinutes: env.passwordResetTokenTtlMinutes,
          requestId: input.requestId,
        });
        audit('password_reset_requested', {
          requestId: input.requestId,
          userId: user.id,
          companyId: user.companyId,
          ipHash: hashIp(input.ip),
          result: 'ACCEPTED',
        });
      } catch (error) {
        audit('password_reset_email_failed', {
          requestId: input.requestId,
          userId: user.id,
          companyId: user.companyId,
          result: 'ERROR',
          error,
        });
      }
    } else {
      audit('password_reset_requested', {
        requestId: input.requestId,
        ipHash: hashIp(input.ip),
        result: 'GENERIC_ACCEPTED',
      });
    }

    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  async resetPassword(input: {
    token?: string;
    newPassword?: string;
    requestId?: string;
    ip?: string;
  }): Promise<{ message: string }> {
    const token = input.token?.trim() ?? '';
    const newPassword = input.newPassword ?? '';
    const record = token
      ? await this.repository.findPasswordResetToken(hashResetToken(token))
      : null;
    const invalid = !record || record.status !== 'PENDING' || record.usedAt !== null ||
      new Date(record.expiresAt).getTime() <= Date.now();

    if (invalid || !record) {
      audit('password_reset_token_invalid', {
        requestId: input.requestId,
        ipHash: hashIp(input.ip),
        result: 'REJECTED',
      });
      throw new Error('INVALID_OR_EXPIRED_RESET_TOKEN');
    }

    const user = await this.repository.findUserById(record.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new Error('INVALID_OR_EXPIRED_RESET_TOKEN');
    }
    assertPasswordPolicy(newPassword, user.email);

    const usedAt = new Date().toISOString();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repository.resetPassword(user.id, record.id, passwordHash, usedAt);
    audit('password_reset_completed', {
      requestId: input.requestId,
      userId: user.id,
      companyId: user.companyId,
      ipHash: hashIp(input.ip),
      result: 'SUCCESS',
    });

    return { message: 'Senha redefinida com sucesso. Entre novamente com a nova senha.' };
  }

  async changePassword(input: {
    auth: AuthTokenPayload;
    currentPassword?: unknown;
    newPassword?: unknown;
    requestId?: string;
    ip?: string;
  }): Promise<{ message: string }> {
    const user = await this.repository.findUserById(input.auth.userId);
    if (!user) {
      throw new Error('INVALID_TOKEN');
    }
    if (user.status !== 'ACTIVE') {
      throw new Error('INACTIVE_USER');
    }

    const currentPassword = typeof input.currentPassword === 'string'
      ? input.currentPassword
      : '';
    const newPassword = typeof input.newPassword === 'string'
      ? input.newPassword
      : '';
    const currentPasswordValid = currentPassword.length > 0 &&
      await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentPasswordValid) {
      throw new Error('CURRENT_PASSWORD_INVALID');
    }
    if (newPassword === currentPassword) {
      throw new Error('PASSWORD_UNCHANGED');
    }

    assertPasswordPolicy(newPassword, user.email);
    const updatedAt = new Date().toISOString();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const changed = await this.repository.changePassword(
      user.id,
      user.passwordHash,
      passwordHash,
      updatedAt,
    );
    if (!changed) {
      const currentUser = await this.repository.findUserById(user.id);
      if (!currentUser || currentUser.status !== 'ACTIVE') {
        throw new Error('INACTIVE_USER');
      }
      throw new Error('CURRENT_PASSWORD_INVALID');
    }

    audit('password_changed', {
      requestId: input.requestId,
      userId: user.id,
      companyId: user.companyId,
      ipHash: hashIp(input.ip),
      result: 'SUCCESS',
    });
    return { message: 'Senha alterada com sucesso.' };
  }

  private async buildAuthResponse(user: AuthUserRecord): Promise<AuthResponse> {
    const payload: AuthTokenPayload = {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      authVersion: user.authVersion,
    };

    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });
    const company = user.companyId
      ? await this.repository.findCompanyById(user.companyId)
      : null;

    return {
      token,
      user: sanitizeUser(user),
      company: sanitizeCompany(company),
    };
  }

  private validateRegisterInput(input: RegisterInput): void {
    if (!input.name?.trim() || !input.email?.trim() || !input.password?.trim()) {
      throw new Error('INVALID_REGISTER_PAYLOAD');
    }

    assertPasswordPolicy(input.password, input.email);

    if (!this.isValidRole(input.role)) {
      throw new Error('INVALID_ROLE');
    }

    if (input.role !== 'ADMIN' && !input.companyId?.trim()) {
      throw new Error('COMPANY_ID_REQUIRED');
    }
  }

  private isValidRole(role: string): role is UserRole {
    return role === 'ADMIN' || role === 'OWNER' || role === 'EMPLOYEE';
  }
}
