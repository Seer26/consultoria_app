export type UserRole = 'ADMIN' | 'OWNER' | 'EMPLOYEE';

export interface AuthUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  companyId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  authVersion: number;
}

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  sector: string | null;
  size: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  companyId: string | null;
  authVersion: number;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  requestedIpHash: string | null;
  requestId: string | null;
  status: 'PENDING' | 'USED' | 'REVOKED';
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    companyId: string | null;
    status: 'ACTIVE' | 'INACTIVE';
  };
  company: {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'INACTIVE';
    sector: string | null;
    size: string | null;
  } | null;
}
