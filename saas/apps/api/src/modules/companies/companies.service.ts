import { randomUUID } from 'node:crypto';

import bcrypt from 'bcrypt';

import { CompaniesRepository } from './companies.repository';
import type {
  CompanyRecord,
  CreateCompanyInput,
  CreateCompanyUserInput,
  EntityStatus,
  ManagedUserRecord,
  ManagedUserRole,
  UpdateCompanyInput,
  UpdateCompanyStatusInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from './companies.types';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .trim();
}

function sanitizeCompany(company: CompanyRecord & { userCount?: number }) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    status: company.status,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    userCount: company.userCount ?? 0,
  };
}

function sanitizeUser(user: ManagedUserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class CompaniesService {
  constructor(private readonly repository: CompaniesRepository) {}

  listCompanies() {
    return this.repository.listCompanies().map(sanitizeCompany);
  }

  getCompanyById(companyId: string) {
    const company = this.repository.findCompanyById(companyId);
    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    return sanitizeCompany(company);
  }

  createCompany(input: CreateCompanyInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new Error('INVALID_COMPANY_NAME');
    }

    const slug = this.buildUniqueCompanySlug(input.slug?.trim() || name);
    const now = new Date().toISOString();
    const company = this.repository.createCompany({
      id: randomUUID(),
      name,
      slug,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    return sanitizeCompany({
      ...company,
      userCount: 0,
    });
  }

  updateCompany(companyId: string, input: UpdateCompanyInput) {
    const existing = this.repository.findCompanyById(companyId);
    if (!existing) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    const name = input.name?.trim();
    if (!name) {
      throw new Error('INVALID_COMPANY_NAME');
    }

    const slug = this.buildUniqueCompanySlug(
      input.slug?.trim() || name,
      existing.id,
    );

    const updated = this.repository.updateCompany({
      id: existing.id,
      name,
      slug,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });

    return sanitizeCompany({
      ...updated,
      userCount: existing.userCount,
    });
  }

  updateCompanyStatus(companyId: string, input: UpdateCompanyStatusInput) {
    const existing = this.repository.findCompanyById(companyId);
    if (!existing) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    this.assertValidStatus(input.status);
    const updatedAt = new Date().toISOString();
    this.repository.updateCompanyStatus(companyId, input.status, updatedAt);

    return sanitizeCompany({
      ...existing,
      status: input.status,
      updatedAt,
    });
  }

  listUsersByCompany(companyId: string) {
    this.ensureCompanyExists(companyId);
    return this.repository.listUsersByCompany(companyId).map(sanitizeUser);
  }

  async createUser(companyId: string, input: CreateCompanyUserInput) {
    this.ensureCompanyExists(companyId);
    this.validateUserPayload(input, true);

    const normalizedEmail = input.email.trim().toLowerCase();
    const existingUser = this.repository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_IN_USE');
    }

    if (input.role === 'ADMIN') {
      throw new Error('INVALID_COMPANY_USER_ROLE');
    }

    const now = new Date().toISOString();
    const user = await this.repository.createUser({
      id: randomUUID(),
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
      companyId,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    return sanitizeUser(user);
  }

  async updateUser(userId: string, input: UpdateUserInput) {
    const existing = this.repository.findUserById(userId);
    if (!existing) {
      throw new Error('USER_NOT_FOUND');
    }

    this.validateUserPayload(input, false);
    if (input.role === 'ADMIN') {
      throw new Error('INVALID_COMPANY_USER_ROLE');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = this.repository.findUserByEmail(normalizedEmail);
    if (duplicate && duplicate.id !== userId) {
      throw new Error('EMAIL_ALREADY_IN_USE');
    }

    if (!existing.companyId) {
      throw new Error('COMPANY_ID_REQUIRED');
    }

    const passwordHash = input.password?.trim()
      ? await bcrypt.hash(input.password, 10)
      : existing.passwordHash;

    const updated = this.repository.updateUser({
      ...existing,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: input.role,
      companyId: existing.companyId,
      updatedAt: new Date().toISOString(),
    });

    return sanitizeUser(updated);
  }

  updateUserStatus(userId: string, input: UpdateUserStatusInput) {
    const existing = this.repository.findUserById(userId);
    if (!existing) {
      throw new Error('USER_NOT_FOUND');
    }

    this.assertValidStatus(input.status);
    const updatedAt = new Date().toISOString();
    this.repository.updateUserStatus(userId, input.status, updatedAt);

    return sanitizeUser({
      ...existing,
      status: input.status,
      updatedAt,
    });
  }

  private ensureCompanyExists(companyId: string): void {
    const company = this.repository.findCompanyById(companyId);
    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }
  }

  private buildUniqueCompanySlug(rawValue: string, currentCompanyId?: string): string {
    const base = slugify(rawValue);
    if (!base) {
      throw new Error('INVALID_COMPANY_SLUG');
    }

    let candidate = base;
    let suffix = 1;

    while (true) {
      const existing = this.repository.findCompanyBySlug(candidate);
      if (!existing || existing.id === currentCompanyId) {
        return candidate;
      }

      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  private validateUserPayload(
    input: CreateCompanyUserInput | UpdateUserInput,
    requirePassword: boolean,
  ): void {
    if (!input.name?.trim() || !input.email?.trim()) {
      throw new Error('INVALID_USER_PAYLOAD');
    }

    if (!this.isValidEmail(input.email)) {
      throw new Error('INVALID_EMAIL');
    }

    if (!this.isValidRole(input.role)) {
      throw new Error('INVALID_ROLE');
    }

    if (requirePassword && !('password' in input && input.password?.trim())) {
      throw new Error('PASSWORD_REQUIRED');
    }

    if ('password' in input && input.password && input.password.trim().length < 6) {
      throw new Error('PASSWORD_TOO_SHORT');
    }
  }

  private assertValidStatus(status: string): asserts status is EntityStatus {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      throw new Error('INVALID_STATUS');
    }
  }

  private isValidRole(role: string): role is ManagedUserRole {
    return role === 'ADMIN' || role === 'OWNER' || role === 'EMPLOYEE';
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
}
