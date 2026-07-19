import { database } from '../../db/database';
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
  findUserByEmail(email: string): AuthUserRecord | null {
    const statement = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, created_at
           , status, updated_at, auth_version
      FROM users
      WHERE email = ?
    `);

    const row = statement.get(email) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  findUserById(id: string): AuthUserRecord | null {
    const statement = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, created_at
           , status, updated_at, auth_version
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
      authVersion: 0,
    };
  }

  createPasswordResetToken(input: PasswordResetTokenRecord): void {
    const transaction = database.transaction(() => {
      database.prepare(`
        UPDATE password_reset_tokens
        SET status = 'REVOKED'
        WHERE user_id = ? AND status = 'PENDING'
      `).run(input.userId);

      database.prepare(`
        INSERT INTO password_reset_tokens (
          id, user_id, token_hash, created_at, expires_at, used_at,
          requested_ip_hash, request_id, status
        ) VALUES (
          @id, @userId, @tokenHash, @createdAt, @expiresAt, @usedAt,
          @requestedIpHash, @requestId, @status
        )
      `).run(input);
    });
    transaction();
  }

  findPasswordResetToken(tokenHash: string): PasswordResetTokenRecord | null {
    const row = database.prepare(`
      SELECT id, user_id, token_hash, created_at, expires_at, used_at,
             requested_ip_hash, request_id, status
      FROM password_reset_tokens
      WHERE token_hash = ?
    `).get(tokenHash) as PasswordResetTokenRow | undefined;

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

  resetPassword(userId: string, tokenId: string, passwordHash: string, usedAt: string): void {
    const transaction = database.transaction(() => {
      database.prepare(`
        UPDATE users
        SET password_hash = ?, auth_version = auth_version + 1, updated_at = ?
        WHERE id = ?
      `).run(passwordHash, usedAt, userId);
      database.prepare(`
        UPDATE password_reset_tokens
        SET status = CASE WHEN id = ? THEN 'USED' ELSE 'REVOKED' END,
            used_at = CASE WHEN id = ? THEN ? ELSE used_at END
        WHERE user_id = ? AND status = 'PENDING'
      `).run(tokenId, tokenId, usedAt, userId);
    });
    transaction();
  }
}
