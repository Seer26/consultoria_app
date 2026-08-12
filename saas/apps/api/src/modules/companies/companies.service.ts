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
  CreateEmployeeInput,
  EntityStatus,
  ManagedUserRecord,
  ManagedUserRole,
  UpdateCompanyInput,
  UpdateCompanySettingsInput,
  UpdateCompanyStatusInput,
  UpdateUserInput,
  UpdateEmployeeInput,
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
    department: user.department,
    jobFunction: user.jobFunction,
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

  async listCompanies() {
    return (await this.repository.listCompanies()).map(sanitizeCompany);
  }

  async getCompanyById(companyId: string) {
    const company = await this.repository.findCompanyById(companyId);
    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    return sanitizeCompany(company);
  }

  async createCompany(input: CreateCompanyInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new Error('INVALID_COMPANY_NAME');
    }

    const slug = await this.buildUniqueCompanySlug(input.slug?.trim() || name);
    const now = new Date().toISOString();
    const company = await this.repository.createCompany({
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
    const existingUser = await this.repository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_IN_USE');
    }

    const now = new Date().toISOString();
    const company: CompanyRecord = {
      id: randomUUID(),
      name: companyName,
      slug: await this.buildUniqueCompanySlug(companyInput.slug?.trim() || companyName),
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
      department: null,
      jobFunction: null,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.repository.createCompanyWithOwner({ company, owner });

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

  async updateCompany(companyId: string, input: UpdateCompanyInput) {
    const existing = await this.repository.findCompanyById(companyId);
    if (!existing) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    const name = input.name?.trim();
    if (!name) {
      throw new Error('INVALID_COMPANY_NAME');
    }

    const slug = await this.buildUniqueCompanySlug(
      input.slug?.trim() || name,
      existing.id,
    );

    const updated = await this.repository.updateCompany({
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

  async updateCompanyStatus(companyId: string, input: UpdateCompanyStatusInput) {
    const existing = await this.repository.findCompanyById(companyId);
    if (!existing) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    this.assertValidStatus(input.status);
    const updatedAt = new Date().toISOString();
    await this.repository.updateCompanyStatus(companyId, input.status, updatedAt);

    return sanitizeCompany({
      ...existing,
      status: input.status,
      updatedAt,
    });
  }

  async listUsersByCompany(companyId: string) {
    await this.ensureCompanyExists(companyId);
    return (await this.repository.listUsersByCompany(companyId)).map(sanitizeUser);
  }

  async createUser(companyId: string, input: CreateCompanyUserInput) {
    await this.ensureCompanyExists(companyId);
    this.validateUserPayload(input, true);

    const normalizedEmail = input.email.trim().toLowerCase();
    assertPasswordPolicy(input.password, normalizedEmail);
    const existingUser = await this.repository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_IN_USE');
    }

    if (input.role === 'ADMIN') {
      throw new Error('INVALID_COMPANY_USER_ROLE');
    }

    await this.entitlementsService.assertCanUseFeature(companyId, 'USER_SEATS');

    const now = new Date().toISOString();
    const user = await this.repository.createUser({
      id: randomUUID(),
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
      companyId,
      status: 'ACTIVE',
      department: this.cleanOptionalText(input.department, null),
      jobFunction: this.cleanOptionalText(input.jobFunction, null),
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
    const existing = await this.repository.findUserById(userId);
    if (!existing) {
      throw new Error('USER_NOT_FOUND');
    }

    this.validateUserPayload(input, false);
    if (input.role === 'ADMIN') {
      throw new Error('INVALID_COMPANY_USER_ROLE');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = await this.repository.findUserByEmail(normalizedEmail);
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

    const updated = await this.repository.updateUser({
      ...existing,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: input.role,
      companyId: existing.companyId,
      department: this.cleanOptionalText(input.department, existing.department),
      jobFunction: this.cleanOptionalText(input.jobFunction, existing.jobFunction),
      updatedAt: new Date().toISOString(),
    });

    return sanitizeUser(updated);
  }

  async updateUserStatus(userId: string, input: UpdateUserStatusInput) {
    const existing = await this.repository.findUserById(userId);
    if (!existing) {
      throw new Error('USER_NOT_FOUND');
    }

    this.assertValidStatus(input.status);
    const updatedAt = new Date().toISOString();
    await this.repository.updateUserStatus(userId, input.status, updatedAt);

    return sanitizeUser({
      ...existing,
      status: input.status,
      updatedAt,
    });
  }

  async listOwnTeam(auth: AuthTokenPayload) {
    const companyId = this.requireOwnerCompany(auth);
    return (await this.repository.listUsersByCompany(companyId))
      .filter((user) => user.role === 'EMPLOYEE')
      .map(sanitizeUser);
  }

  async createOwnEmployee(auth: AuthTokenPayload, input: CreateEmployeeInput) {
    const companyId = this.requireOwnerCompany(auth);
    if ((input as CreateEmployeeInput & { role?: string }).role &&
        (input as CreateEmployeeInput & { role?: string }).role !== 'EMPLOYEE') {
      throw new Error('INVALID_COMPANY_USER_ROLE');
    }
    this.validateEmployeeProfile(input);
    if (!input.password?.trim()) throw new Error('PASSWORD_REQUIRED');
    const normalizedEmail = input.email.trim().toLowerCase();
    assertPasswordPolicy(input.password, normalizedEmail);
    if (await this.repository.findUserByEmail(normalizedEmail)) throw new Error('EMAIL_ALREADY_IN_USE');
    await this.entitlementsService.assertCanUseFeature(companyId, 'USER_SEATS');
    const now = new Date().toISOString();
    const user = await this.repository.createUser({
      id: randomUUID(), name: input.name.trim(), email: normalizedEmail,
      passwordHash: await bcrypt.hash(input.password, 10), role: 'EMPLOYEE',
      companyId, status: 'ACTIVE', department: input.department.trim(),
      jobFunction: input.jobFunction.trim(), createdAt: now, updatedAt: now,
    });
    audit('EMPLOYEE_CREATED_BY_OWNER', { actorUserId: auth.userId, userId: user.id, companyId });
    return sanitizeUser(user);
  }

  async updateOwnEmployee(auth: AuthTokenPayload, userId: string, input: UpdateEmployeeInput) {
    const companyId = this.requireOwnerCompany(auth);
    const existing = await this.requireOwnEmployee(companyId, userId);
    this.validateEmployeeProfile(input);
    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = await this.repository.findUserByEmail(normalizedEmail);
    if (duplicate && duplicate.id !== userId) throw new Error('EMAIL_ALREADY_IN_USE');
    let passwordHash = existing.passwordHash;
    if (input.password?.trim()) {
      assertPasswordPolicy(input.password, normalizedEmail);
      passwordHash = await bcrypt.hash(input.password, 10);
    }
    const updated = await this.repository.updateUser({
      ...existing, name: input.name.trim(), email: normalizedEmail, passwordHash,
      department: input.department.trim(), jobFunction: input.jobFunction.trim(),
      updatedAt: new Date().toISOString(),
    });
    audit('EMPLOYEE_PROFILE_UPDATED', { actorUserId: auth.userId, userId, companyId });
    return sanitizeUser(updated);
  }

  async updateOwnEmployeeStatus(auth: AuthTokenPayload, userId: string, input: UpdateUserStatusInput) {
    const companyId = this.requireOwnerCompany(auth);
    const existing = await this.requireOwnEmployee(companyId, userId);
    this.assertValidStatus(input.status);
    const updatedAt = new Date().toISOString();
    await this.repository.updateUserStatus(userId, input.status, updatedAt);
    audit('EMPLOYEE_STATUS_CHANGED', { actorUserId: auth.userId, userId, companyId, status: input.status });
    return sanitizeUser({ ...existing, status: input.status, updatedAt });
  }

  async getOwnCompanySettings(auth: AuthTokenPayload): Promise<CompanySettingsRecord> {
    if (auth.role !== 'OWNER') {
      throw new Error('FORBIDDEN');
    }

    if (!auth.companyId) {
      throw new Error('COMPANY_ID_REQUIRED');
    }

    const company = await this.repository.findCompanyById(auth.companyId);
    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    return sanitizeCompanySettings(company);
  }

  async updateOwnCompanySettings(
    auth: AuthTokenPayload,
    input: UpdateCompanySettingsInput,
  ): Promise<CompanySettingsRecord> {
    if (auth.role !== 'OWNER') {
      throw new Error('FORBIDDEN');
    }

    if (!auth.companyId) {
      throw new Error('COMPANY_ID_REQUIRED');
    }

    const existing = await this.repository.findCompanyById(auth.companyId);
    if (!existing) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    const name = input.name === undefined ? existing.name : input.name.trim();
    if (!name) {
      throw new Error('INVALID_COMPANY_NAME');
    }

    const updated = await this.repository.updateCompanySettings({
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

  private async ensureCompanyExists(companyId: string): Promise<void> {
    const company = await this.repository.findCompanyById(companyId);
    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }
  }

  private requireOwnerCompany(auth: AuthTokenPayload): string {
    if (auth.role !== 'OWNER') throw new Error('FORBIDDEN');
    if (!auth.companyId) throw new Error('COMPANY_ID_REQUIRED');
    return auth.companyId;
  }

  private async requireOwnEmployee(companyId: string, userId: string): Promise<ManagedUserRecord> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.companyId !== companyId || user.role !== 'EMPLOYEE') throw new Error('FORBIDDEN');
    return user;
  }

  private validateEmployeeProfile(input: CreateEmployeeInput | UpdateEmployeeInput): void {
    if (!input.name?.trim() || !input.email?.trim() || !input.department?.trim() || !input.jobFunction?.trim()) {
      throw new Error('EMPLOYEE_PROFILE_REQUIRED');
    }
    if (!this.isValidEmail(input.email)) throw new Error('INVALID_EMAIL');
  }

  private async buildUniqueCompanySlug(
    rawValue: string,
    currentCompanyId?: string,
  ): Promise<string> {
    const base = slugify(rawValue);
    if (!base) {
      throw new Error('INVALID_COMPANY_SLUG');
    }

    let candidate = base;
    let suffix = 1;

    while (true) {
      const existing = await this.repository.findCompanyBySlug(candidate);
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
