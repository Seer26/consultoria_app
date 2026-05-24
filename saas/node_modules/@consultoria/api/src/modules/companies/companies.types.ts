export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type ManagedUserRole = 'ADMIN' | 'OWNER' | 'EMPLOYEE';

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: ManagedUserRole;
  companyId: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyInput {
  name: string;
  slug?: string;
}

export interface UpdateCompanyInput {
  name: string;
  slug?: string;
}

export interface UpdateCompanyStatusInput {
  status: EntityStatus;
}

export interface CreateCompanyUserInput {
  name: string;
  email: string;
  password: string;
  role: ManagedUserRole;
}

export interface UpdateUserInput {
  name: string;
  email: string;
  role: ManagedUserRole;
  password?: string;
}

export interface UpdateUserStatusInput {
  status: EntityStatus;
}
