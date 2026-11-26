import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from 'pg';

const GRANT_CONFIRMATION = 'GRANT-ADMIN-CREATE';
const DEFAULT_PERMISSION = 'admin:create';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const domainParts = (domain ?? '').split('.');
  const host = domainParts.shift() ?? '';
  const suffix = domainParts.length > 0 ? `.${domainParts.join('.')}` : '';
  return `${(local ?? '').slice(0, 1)}***@${host.slice(0, 1)}***${suffix}`;
}

export async function grantAdminPermission(rawEnv: NodeJS.ProcessEnv = process.env): Promise<{
  granted: boolean;
  alreadyGranted: boolean;
  idPreview: string;
  maskedEmail: string;
  permission: string;
}> {
  if (rawEnv.GRANT_PERMISSION_CONFIRM !== GRANT_CONFIRMATION) {
    throw new Error('GRANT_PERMISSION_CONFIRMATION_REQUIRED');
  }

  const databaseUrl = rawEnv.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('POSTGRES_PROVIDER_REQUIRED');
  }

  const email = rawEnv.GRANT_ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('GRANT_ADMIN_EMAIL_INVALID');
  }

  const permission = rawEnv.GRANT_PERMISSION_NAME?.trim() || DEFAULT_PERMISSION;
  if (permission !== 'admin:create') {
    throw new Error('UNSUPPORTED_ADMIN_PERMISSION');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  let inTransaction = false;

  try {
    await client.query('BEGIN');
    inTransaction = true;

    const userRes = await client.query<{
      id: string;
      email: string;
      role: string;
      status: string;
      company_id: string | null;
    }>(
      `SELECT id, email, role, status, company_id
       FROM users
       WHERE LOWER(BTRIM(email)) = $1
       LIMIT 1`,
      [email],
    );

    const user = userRes.rows[0];
    if (!user) {
      throw new Error('TARGET_ADMIN_NOT_FOUND');
    }
    if (user.role !== 'ADMIN' || user.company_id !== null) {
      throw new Error('TARGET_USER_IS_NOT_GLOBAL_ADMIN');
    }
    if (user.status !== 'ACTIVE') {
      throw new Error('TARGET_ADMIN_INACTIVE');
    }

    const existingPerm = await client.query<{ id: string }>(
      `SELECT id FROM user_permissions WHERE user_id = $1 AND permission = $2 LIMIT 1`,
      [user.id, permission],
    );

    const alreadyGranted = existingPerm.rows.length > 0;
    const now = new Date().toISOString();

    if (!alreadyGranted) {
      await client.query(
        `INSERT INTO user_permissions (id, user_id, permission, granted_by_user_id, created_at)
         VALUES ($1, $2, $3, NULL, $4)`,
        [randomUUID(), user.id, permission, now],
      );

      await client.query(
        `INSERT INTO audit_events (id, event, actor_user_id, company_id, result, metadata_json, created_at)
         VALUES ($1, $2, $3, NULL, 'SUCCESS', $4, $5)`,
        [
          randomUUID(),
          'admin_permission_granted',
          user.id,
          JSON.stringify({
            targetUserId: user.id,
            permission,
            mechanism: 'cli_grant_admin_permission',
          }),
          now,
        ],
      );
    }

    await client.query('COMMIT');
    inTransaction = false;

    return {
      granted: !alreadyGranted,
      alreadyGranted,
      idPreview: `${user.id.slice(0, 8)}...`,
      maskedEmail: maskEmail(user.email),
      permission,
    };
  } catch (error) {
    if (inTransaction) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    throw error;
  } finally {
    await client.end();
  }
}

const isCli = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isCli) {
  grantAdminPermission()
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error) => {
      console.error('Grant admin permission failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
