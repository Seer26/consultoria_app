import { dataSource } from '../../database/data-source';
import type { AdminUserSummary } from './admins.types';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface PermissionRow {
  user_id: string;
  permission: string;
}

export class AdminsRepository {
  async listAdmins(): Promise<AdminUserSummary[]> {
    const users = await dataSource.many<AdminUserRow>(
      `SELECT id, name, email, role, status, created_at, updated_at
       FROM users
       WHERE role = 'ADMIN'
       ORDER BY created_at ASC, email ASC`,
    );

    if (users.length === 0) {
      return [];
    }

    const perms = await dataSource.many<PermissionRow>(
      `SELECT up.user_id, up.permission
       FROM user_permissions up
       INNER JOIN users u ON u.id = up.user_id
       WHERE u.role = 'ADMIN'
       ORDER BY up.permission ASC`,
    );

    const permMap = new Map<string, string[]>();
    for (const row of perms) {
      const list = permMap.get(row.user_id) ?? [];
      list.push(row.permission);
      permMap.set(row.user_id, list);
    }

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: 'ADMIN',
      status: u.status,
      permissions: permMap.get(u.id) ?? [],
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
  }

  async findAdminById(id: string): Promise<AdminUserSummary | null> {
    const row = await dataSource.one<AdminUserRow>(
      `SELECT id, name, email, role, status, created_at, updated_at
       FROM users
       WHERE id = ? AND role = 'ADMIN'`,
      [id],
    );
    if (!row) {
      return null;
    }

    const perms = await dataSource.many<{ permission: string }>(
      `SELECT permission FROM user_permissions WHERE user_id = ? ORDER BY permission ASC`,
      [id],
    );

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: 'ADMIN',
      status: row.status,
      permissions: perms.map((p) => p.permission),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    return (
      (await dataSource.one<{ id: string }>(
        `SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
        [email],
      )) ?? null
    );
  }

  async countOtherActiveAdminsWithPermission(
    excludeUserId: string,
    permission: string,
  ): Promise<number> {
    const row = await dataSource.one<{ count: number | string }>(
      `SELECT COUNT(*)::int AS count
       FROM users u
       INNER JOIN user_permissions up ON up.user_id = u.id
       WHERE u.role = 'ADMIN'
         AND u.status = 'ACTIVE'
         AND up.permission = ?
         AND u.id <> ?`,
      [permission, excludeUserId],
    ).catch(async () => {
      // SQLite fallback without ::int cast
      return dataSource.one<{ count: number | string }>(
        `SELECT COUNT(*) AS count
         FROM users u
         INNER JOIN user_permissions up ON up.user_id = u.id
         WHERE u.role = 'ADMIN'
           AND u.status = 'ACTIVE'
           AND up.permission = ?
           AND u.id <> ?`,
        [permission, excludeUserId],
      );
    });
    return Number(row?.count ?? 0);
  }

  async countOtherActiveAdmins(excludeUserId: string): Promise<number> {
    const row = await dataSource.one<{ count: number | string }>(
      `SELECT COUNT(*) AS count
       FROM users
       WHERE role = 'ADMIN'
         AND status = 'ACTIVE'
         AND id <> ?`,
      [excludeUserId],
    );
    return Number(row?.count ?? 0);
  }

  async insertAdmin(input: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: string;
    grantedByUserId: string;
    grantPermission?: { id: string; permission: string };
    inviteTokenRecord?: {
      id: string;
      tokenHash: string;
      expiresAt: string;
      requestedIpHash: string | null;
      requestId: string | null;
    };
  }): Promise<void> {
    await dataSource.execute(
      `INSERT INTO users (
        id, name, email, password_hash, role, company_id, created_at, updated_at, status, auth_version
      ) VALUES (
        @id, @name, @email, @passwordHash, 'ADMIN', NULL, @createdAt, @createdAt, 'ACTIVE', 0
      )`,
      {
        id: input.id,
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        createdAt: input.createdAt,
      },
    );

    if (input.grantPermission) {
      await dataSource.execute(
        `INSERT INTO user_permissions (id, user_id, permission, granted_by_user_id, created_at)
         VALUES (@id, @userId, @permission, @grantedByUserId, @createdAt)`,
        {
          id: input.grantPermission.id,
          userId: input.id,
          permission: input.grantPermission.permission,
          grantedByUserId: input.grantedByUserId,
          createdAt: input.createdAt,
        },
      );
    }

    if (input.inviteTokenRecord) {
      await dataSource.execute(
        `INSERT INTO password_reset_tokens (
          id, user_id, token_hash, created_at, expires_at, used_at,
          requested_ip_hash, request_id, status
        ) VALUES (
          @id, @userId, @tokenHash, @createdAt, @expiresAt, NULL,
          @requestedIpHash, @requestId, 'PENDING'
        )`,
        {
          id: input.inviteTokenRecord.id,
          userId: input.id,
          tokenHash: input.inviteTokenRecord.tokenHash,
          createdAt: input.createdAt,
          expiresAt: input.inviteTokenRecord.expiresAt,
          requestedIpHash: input.inviteTokenRecord.requestedIpHash,
          requestId: input.inviteTokenRecord.requestId,
        },
      );
    }
  }

  async updateAdminStatus(
    userId: string,
    status: 'ACTIVE' | 'INACTIVE',
    updatedAt: string,
  ): Promise<void> {
    if (status === 'INACTIVE') {
      await dataSource.execute(
        `UPDATE users
         SET status = ?, updated_at = ?, auth_version = auth_version + 1
         WHERE id = ? AND role = 'ADMIN'`,
        [status, updatedAt, userId],
      );
      return;
    }

    await dataSource.execute(
      `UPDATE users
       SET status = ?, updated_at = ?
       WHERE id = ? AND role = 'ADMIN'`,
      [status, updatedAt, userId],
    );
  }

  async setUserPermission(input: {
    permissionRowId: string;
    userId: string;
    permission: string;
    grant: boolean;
    grantedByUserId: string;
    createdAt: string;
  }): Promise<void> {
    if (input.grant) {
      await dataSource.execute(
        `INSERT OR IGNORE INTO user_permissions (id, user_id, permission, granted_by_user_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          input.permissionRowId,
          input.userId,
          input.permission,
          input.grantedByUserId,
          input.createdAt,
        ],
      );
      return;
    }

    await dataSource.execute(
      `DELETE FROM user_permissions WHERE user_id = ? AND permission = ?`,
      [input.userId, input.permission],
    );
  }
}
