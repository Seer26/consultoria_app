import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env';
import { AuthRepository } from './auth.repository';
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

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    this.validateRegisterInput(input);

    const existingUser = this.repository.findUserByEmail(input.email);

    if (existingUser) {
      throw new Error('EMAIL_ALREADY_IN_USE');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.repository.createUser({
      ...input,
      id: `user-${Date.now()}`,
      email: input.email.trim().toLowerCase(),
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    if (!input.email?.trim() || !input.password?.trim()) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const user = this.repository.findUserByEmail(input.email.trim().toLowerCase());

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    return this.buildAuthResponse(user);
  }

  verifyToken(token: string): AuthTokenPayload {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    return decoded;
  }

  private buildAuthResponse(user: AuthUserRecord): AuthResponse {
    const payload: AuthTokenPayload = {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
    };

    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });
    const company = user.companyId
      ? this.repository.findCompanyById(user.companyId)
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

    if (input.password.length < 6) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

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
