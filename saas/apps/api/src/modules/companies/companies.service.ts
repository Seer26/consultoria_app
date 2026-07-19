import { randomUUID } from 'node:crypto';

import bcrypt from 'bcrypt';

import type { AuthTokenPayload } from '../auth/auth.types';
import { audit } from '../../shared/audit';
import { CompaniesRepository } from './companies.repository';
import type {
  CompanySettingsRecord,
  CompanyRecord,
  CreateCompanyInput,
  CreateCompanyWithOwnerInput,
  CreateCompanyUserInput,
  EntityStatus,
  ManagedUserRecord,
  ManagedUserRole,
  UpdateCompanyInput,
  UpdateCompanySettingsInput,
  UpdateCompanyStatusInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from './companies.types';
import { EntitlementsRepository } from '../entitlements/entitlements.repository';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { assertPasswordPolicy } from '../auth/password-policy';

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
    sector: company.sector,
    size: company.size,
    phone: company.phone,
    responsibleName: company.responsibleName,
    notes: company.notes,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    userCount: company.userCount ?? 0,
  };
}

function sanitizeCompanySettings(company: CompanyRecord): CompanySettingsRecord {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    status: company.status,
    sector: company.sector,
    size: company.size,
    phone: company.phone,
    responsibleName: company.responsibleName,
    notes: company.notes,
    updatedAt: company.updatedAt,
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
  constructor(
    private readonly repository: CompaniesRepository,
    private readonly entitlementsService = new EntitlementsService(
      new EntitlementsRepository(),
    ),
  ) {}

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
      sector: null,
      size: null,
      phone: null,
      responsibleName: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });

    audit('company_created', {
      companyId: company.id,
      slug: company.slug,
    });

    return sanitizeCompany({
      ...company,
      userCount: 0,
    });
  }

  async createCompanyWithOwner(input: CreateCompanyWithOwnerInput) {
    const companyInput = input?.company;
    const ownerInput = input?.owner;
    const companyName = companyInput?.name?.trim();

    if (!companyName) {
      throw new Error('INVALID_COMPANY_NAME');
    }

    this.validateOwnerPayload(ownerInput);

    const normalizedEmail = ownerInput.email.trim().toLowerCase();
    assertPasswordPolicy(ownerInput.password, normalizedEmail);
    const existingUser = this.repository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_IN_USE');
    }

    const now = new Date().toISOString();
    const company: CompanyRecord = {
      id: randomUUID(),
      name: companyName,
      slug: this.buildUniqueCompanySlug(companyInput.slug?.trim() || companyName),
      status: 'ACTIVE',
      sector: null,
      size: null,
      phone: null,
      responsibleName: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    const owner: ManagedUserRecord = {
      id: randomUUID(),
      name: ownerInput.name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(ownerInput.password, 10),
      role: 'OWNER',
      companyId: company.id,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    const created = this.repository.createCompanyWithOwner({ company, owner });

    audit('company_created', {
      companyId: created.company.id,
      slug: created.company.slug,
      withOwner: true,
    });
    audit('user_created', {
      userId: created.owner.id,
      companyId: created.company.id,
      role: created.owner.role,
    });

    return {
      company: sanitizeCompany({
        ...created.company,
        userCount: 1,
      }),
      owner: sanitizeUser(created.owner),
    };
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
      sector: existing.sector,
      size: existing.size,
      phone: existing.phone,
      responsibleName: existing.responsibleName,
      notes: existing.notes,
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
    assertPasswordPolicy(input.password, normalizedEmail);
    const existingUser = this.repository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_IN_USE');
    }

    if (input.role === 'ADMIN') {
      throw new Error('INVALID_COMPANY_USER_ROLE');
    }

    this.entitlementsService.assertCanUseFeature(companyId, 'USER_SEATS');

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

    audit('user_created', {
      userId: user.id,
      companyId,
      role: user.role,
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

    let passwordHash = existing.passwordHash;
    if (input.password?.trim()) {
      assertPasswordPolicy(input.password, normalizedEmail);
      passwordHash = await bcrypt.hash(input.password, 10);
    }

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

  getOwnCompanySettings(auth: AuthTokenPayload): CompanySettingsRecord {
    if (auth.role !== 'OWNER') {
      throw new Error('FORBIDDEN');
    }

    if (!auth.companyId) {
      throw new Error('COMPANY_ID_REQUIRED');
    }

    const company = this.repository.findCompanyById(auth.companyId);
    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    return sanitizeCompanySettings(company);
  }

  updateOwnCompanySettings(
    auth: AuthTokenPayload,
    input: UpdateCompanySettingsInput,
  ): CompanySettingsRecord {
    if (auth.role !== 'OWNER') {
      throw new Error('FORBIDDEN');
    }

    if (!auth.companyId) {
      throw new Error('COMPANY_ID_REQUIRED');
    }

    const existing = this.repository.findCompanyById(auth.companyId);
    if (!existing) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    const name = input.name === undefined ? existing.name : input.name.trim();
    if (!name) {
      throw new Error('INVALID_COMPANY_NAME');
    }

    const updated = this.repository.updateCompanySettings({
      ...existing,
      name,
      sector: this.cleanOptionalText(input.sector, existing.sector),
      size: this.cleanOptionalText(input.size, existing.size),
      phone: this.cleanOptionalText(input.phone, existing.phone),
      responsibleName: this.cleanOptionalText(
        input.responsibleName,
        existing.responsibleName,
      ),
      notes: this.cleanOptionalText(input.notes, existing.notes),
      updatedAt: new Date().toISOString(),
    });

    return sanitizeCompanySettings(updated);
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

  }

  private validateOwnerPayload(input?: CreateCompanyWithOwnerInput['owner']): void {
    if (!input?.name?.trim() || !input.email?.trim() || !input.password?.trim()) {
      throw new Error('INVALID_OWNER_PAYLOAD');
    }

    if (!this.isValidEmail(input.email)) {
      throw new Error('INVALID_EMAIL');
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

  private cleanOptionalText(value: string | null | undefined, fallback: string | null): string | null {
    if (value === undefined) {
      return fallback;
    }

    const normalized = value?.trim() ?? '';
    return normalized.length > 0 ? normalized : null;
  }
}
