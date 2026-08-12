import { env } from '../config/env';
import { dataSource } from '../database/data-source';
import { getPostgresMigrationStatus } from '../database/migrate';
import { getEmailProviderReadiness } from '../modules/auth/email.service';
import { operationalAlert } from '../shared/alerts';

type DatabaseCheck = {
  status: 'ready' | 'not_ready';
  provider: 'sqlite' | 'postgres';
  connectivity: 'connected' | 'unavailable';
  schema: 'ready' | 'missing';
  migrations: {
    status: 'current' | 'pending' | 'embedded';
    applied?: number;
    available?: number;
    pendingCount: number;
  };
};

const requiredTables = [
  'users',
  'companies',
  'password_reset_tokens',
  'legal_acceptances',
  'company_subscriptions',
  'diagnosis_submissions',
  'action_plan_tasks',
];

async function checkDatabase(): Promise<DatabaseCheck> {
  try {
    await dataSource.ping();
    if (dataSource.provider === 'postgres') {
      const migrations = await getPostgresMigrationStatus();
      const current = migrations.pending.length === 0;
      return {
        status: current ? 'ready' : 'not_ready',
        provider: 'postgres',
        connectivity: 'connected',
        schema: current ? 'ready' : 'missing',
        migrations: {
          status: current ? 'current' : 'pending',
          applied: migrations.applied,
          available: migrations.available,
          pendingCount: migrations.pending.length,
        },
      };
    }

    const rows = await dataSource.many<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table'`,
    );
    const existing = new Set(rows.map((row) => row.name));
    const schemaReady = requiredTables.every((table) => existing.has(table));
    return {
      status: schemaReady ? 'ready' : 'not_ready',
      provider: 'sqlite',
      connectivity: 'connected',
      schema: schemaReady ? 'ready' : 'missing',
      migrations: {
        status: 'embedded',
        pendingCount: 0,
      },
    };
  } catch {
    return {
      status: 'not_ready',
      provider: dataSource.provider,
      connectivity: 'unavailable',
      schema: 'missing',
      migrations: {
        status: dataSource.provider === 'postgres' ? 'pending' : 'embedded',
        pendingCount: dataSource.provider === 'postgres' ? -1 : 0,
      },
    };
  }
}

export async function getHealth() {
  const database = await checkDatabase();
  return {
    status: database.connectivity === 'connected' ? 'ok' as const : 'error' as const,
    api: 'online' as const,
    environment: env.appEnv,
    database,
    timestamp: new Date().toISOString(),
  };
}

export async function getReadiness() {
  const databaseStatus = await checkDatabase();
  const emailStatus = getEmailProviderReadiness();
  const restricted = env.isStaging || env.nodeEnv === 'production';
  const appUrlSecure = !restricted || env.appPublicUrl.startsWith('https://');
  const apiUrlSecure = !restricted || env.apiPublicUrl.startsWith('https://');
  const aiStatus = !env.aiEnabled
    ? 'disabled'
    : env.aiApiKey
      ? 'configured'
      : 'not_configured';
  const aiReady =
    !env.requireAiInReadiness || (env.aiEnabled && Boolean(env.aiApiKey));
  const criticalReady =
    databaseStatus.status === 'ready' &&
    emailStatus.status === 'ready' &&
    appUrlSecure &&
    apiUrlSecure &&
    aiReady;
  const status = !criticalReady
    ? 'not_ready'
    : env.aiEnabled && aiStatus !== 'configured'
      ? 'degraded'
      : 'ready';

  if (status !== 'ready') {
    operationalAlert(
      'readiness_failed',
      status === 'not_ready' ? 'error' : 'warn',
      { environment: env.appEnv, status },
    );
  }

  return {
    status,
    api: 'online' as const,
    environment: env.appEnv,
    checks: {
      database: databaseStatus,
      email: emailStatus,
      publicUrl: { status: appUrlSecure ? 'ready' : 'not_ready' },
      apiPublicUrl: { status: apiUrlSecure ? 'ready' : 'not_ready' },
      openai: { status: aiStatus, required: env.requireAiInReadiness },
    },
    timestamp: new Date().toISOString(),
  };
}
