import { env } from '../config/env';
import { database } from '../db/database';
import { getEmailProviderReadiness } from '../modules/auth/email.service';
import { operationalAlert } from '../shared/alerts';

export function getHealth() {
  return {
    status: 'ok' as const,
    api: 'online' as const,
    environment: env.appEnv,
    timestamp: new Date().toISOString(),
  };
}

function checkDatabase(): { status: 'ready' | 'not_ready'; provider: 'sqlite'; schema: 'ready' | 'missing' } {
  try {
    database.prepare('SELECT 1').get();
    const requiredTables = ['users', 'companies', 'password_reset_tokens', 'legal_acceptances'];
    const rows = database.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table'
    `).all() as Array<{ name: string }>;
    const existing = new Set(rows.map((row) => row.name));
    const schemaReady = requiredTables.every((table) => existing.has(table));
    return {
      status: schemaReady ? 'ready' : 'not_ready',
      provider: 'sqlite',
      schema: schemaReady ? 'ready' : 'missing',
    };
  } catch {
    return { status: 'not_ready', provider: 'sqlite', schema: 'missing' };
  }
}

export function getReadiness() {
  const databaseStatus = checkDatabase();
  const emailStatus = getEmailProviderReadiness();
  const restricted = env.isStaging || env.nodeEnv === 'production';
  const appUrlSecure = !restricted ||
    env.appPublicUrl.startsWith('https://');
  const apiUrlSecure = !restricted ||
    env.apiPublicUrl.startsWith('https://');
  const aiStatus = env.aiApiKey ? 'configured' : 'not_configured';
  const aiReady = !env.requireAiInReadiness || Boolean(env.aiApiKey);
  const criticalReady = databaseStatus.status === 'ready' &&
    emailStatus.status === 'ready' &&
    appUrlSecure &&
    apiUrlSecure &&
    aiReady;
  const status = !criticalReady
    ? 'not_ready'
    : aiStatus === 'not_configured'
      ? 'degraded'
      : 'ready';

  if (status !== 'ready') {
    operationalAlert('readiness_failed', status === 'not_ready' ? 'error' : 'warn', {
      environment: env.appEnv,
      status,
    });
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
