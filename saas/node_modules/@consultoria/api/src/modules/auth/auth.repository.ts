import { database } from '../../db/database';
import type { AuthUserRecord, CompanyRecord, RegisterInput } from './auth.types';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  company_id: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  sector: string | null;
  size: string | null;
  created_at: string;
  updated_at: string;
}

function mapUser(row: UserRow): AuthUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as AuthUserRecord['role'],
    companyId: row.company_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompany(row: CompanyRow): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    sector: row.sector,
    size: row.size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AuthRepository {
  findUserByEmail(email: string): AuthUserRecord | null {
    const statement = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, created_at
           , status, updated_at
      FROM users
      WHERE email = ?
    `);

    const row = statement.get(email) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  findUserById(id: string): AuthUserRecord | null {
    const statement = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, created_at
           , status, updated_at
      FROM users
      WHERE id = ?
    `);

    const row = statement.get(id) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  findCompanyById(id: string): CompanyRecord | null {
    const statement = database.prepare(`
      SELECT id, name, slug, status, sector, size, created_at, updated_at
      FROM companies
      WHERE id = ?
    `);

    const row = statement.get(id) as CompanyRow | undefined;
    return row ? mapCompany(row) : null;
  }

  createUser(input: RegisterInput & { id: string; passwordHash: string }): AuthUserRecord {
    const statement = database.prepare(`
      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        company_id,
        created_at,
        updated_at,
        status
      )
      VALUES (
        @id,
        @name,
        @email,
        @passwordHash,
        @role,
        @companyId,
        @createdAt,
        @updatedAt,
        @status
      )
    `);

    const createdAt = new Date().toISOString();

    statement.run({
      id: input.id,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      companyId: input.companyId ?? null,
      status: 'ACTIVE',
      createdAt,
      updatedAt: createdAt,
    });

    return {
      id: input.id,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      companyId: input.companyId ?? null,
      status: 'ACTIVE',
      createdAt,
      updatedAt: createdAt,
    };
  }
}
