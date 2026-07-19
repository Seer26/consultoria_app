import { dataSource } from '../../database/data-source';
import type { AuthUserRecord, CompanyRecord, PasswordResetTokenRecord, RegisterInput } from './auth.types';

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
  auth_version: number;
}

interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  requested_ip_hash: string | null;
  request_id: string | null;
  status: PasswordResetTokenRecord['status'];
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
    authVersion: Number(row.auth_version ?? 0),
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
  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const row = await dataSource.one<UserRow>(`
      SELECT id, name, email, password_hash, role, company_id, created_at
           , status, updated_at, auth_version
      FROM users
      WHERE email = ?
    `, [email]);
    return row ? mapUser(row) : null;
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    const row = await dataSource.one<UserRow>(`
      SELECT id, name, email, password_hash, role, company_id, created_at
           , status, updated_at, auth_version
      FROM users
      WHERE id = ?
    `, [id]);
    return row ? mapUser(row) : null;
  }

  async findCompanyById(id: string): Promise<CompanyRecord | null> {
    const row = await dataSource.one<CompanyRow>(`
      SELECT id, name, slug, status, sector, size, created_at, updated_at
      FROM companies
      WHERE id = ?
    `, [id]);
    return row ? mapCompany(row) : null;
  }

  async createUser(
    input: RegisterInput & { id: string; passwordHash: string },
  ): Promise<AuthUserRecord> {
    const createdAt = new Date().toISOString();
    await dataSource.execute(`
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
    `, {
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
      authVersion: 0,
    };
  }

  async createPasswordResetToken(input: PasswordResetTokenRecord): Promise<void> {
    await dataSource.transaction(async () => {
      await dataSource.execute(`
        UPDATE password_reset_tokens
        SET status = 'REVOKED'
        WHERE user_id = ? AND status = 'PENDING'
      `, [input.userId]);

      await dataSource.execute(`
        INSERT INTO password_reset_tokens (
          id, user_id, token_hash, created_at, expires_at, used_at,
          requested_ip_hash, request_id, status
        ) VALUES (
          @id, @userId, @tokenHash, @createdAt, @expiresAt, @usedAt,
          @requestedIpHash, @requestId, @status
        )
      `, input);
    });
  }

  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const row = await dataSource.one<PasswordResetTokenRow>(`
      SELECT id, user_id, token_hash, created_at, expires_at, used_at,
             requested_ip_hash, request_id, status
      FROM password_reset_tokens
      WHERE token_hash = ?
    `, [tokenHash]);

    return row ? {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      requestedIpHash: row.requested_ip_hash,
      requestId: row.request_id,
      status: row.status,
    } : null;
  }

  async resetPassword(
    userId: string,
    tokenId: string,
    passwordHash: string,
    usedAt: string,
  ): Promise<void> {
    await dataSource.transaction(async () => {
      await dataSource.execute(`
        UPDATE users
        SET password_hash = ?, auth_version = auth_version + 1, updated_at = ?
        WHERE id = ?
      `, [passwordHash, usedAt, userId]);
      await dataSource.execute(`
        UPDATE password_reset_tokens
        SET status = CASE WHEN id = ? THEN 'USED' ELSE 'REVOKED' END,
            used_at = CASE WHEN id = ? THEN ? ELSE used_at END
        WHERE user_id = ? AND status = 'PENDING'
      `, [tokenId, tokenId, usedAt, userId]);
    });
  }
}
