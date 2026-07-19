import { Client, Pool } from 'pg';

import { env } from '../config/env';

export function createPostgresClient(): Client {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL_REQUIRED');
  }

  return new Client({
    connectionString: env.databaseUrl,
  });
}

let postgresPool: Pool | null = null;

export function getPostgresPool(): Pool {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL_REQUIRED');
  }
  if (!postgresPool) {
    postgresPool = new Pool({
      connectionString: env.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return postgresPool;
}
