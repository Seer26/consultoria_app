import { Client } from 'pg';

import { env } from '../config/env';

export function createPostgresClient(): Client {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL_REQUIRED');
  }

  return new Client({
    connectionString: env.databaseUrl,
  });
}
