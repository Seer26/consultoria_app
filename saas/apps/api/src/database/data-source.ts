import { AsyncLocalStorage } from 'node:async_hooks';

import type Database from 'better-sqlite3';
import { types as postgresTypes, type PoolClient, type QueryResultRow } from 'pg';

import { env } from '../config/env';
import { getPostgresPool } from './postgres';

export type DatabaseProvider = 'sqlite' | 'postgres';
export type QueryParameters = readonly unknown[] | object;

export interface DatabaseCommandResult {
  changes: number;
}

interface PostgresQuery {
  text: string;
  values: unknown[];
}

const transactionClient = new AsyncLocalStorage<PoolClient>();
let sqliteDatabasePromise: Promise<Database.Database> | null = null;

// Preserve timestamps as UTC strings at the API boundary, matching SQLite.
postgresTypes.setTypeParser(1114, (value: string) => `${value.replace(' ', 'T')}Z`);
postgresTypes.setTypeParser(1184, (value: string) => new Date(value).toISOString());

async function getSqliteDatabase(): Promise<Database.Database> {
  if (!sqliteDatabasePromise) {
    sqliteDatabasePromise = import('../db/database').then(({ database }) => database);
  }
  return sqliteDatabasePromise;
}

export function postgresParameters(
  sql: string,
  parameters: QueryParameters = [],
): PostgresQuery {
  if (Array.isArray(parameters)) {
    let position = 0;
    const text = sql.replace(/\?/g, () => `$${++position}`);
    if (position !== parameters.length) {
      throw new Error('DATABASE_PARAMETER_COUNT_MISMATCH');
    }
    return { text, values: [...parameters] };
  }

  const values: unknown[] = [];
  const positions = new Map<string, number>();
  const named = parameters as Record<string, unknown>;
  const text = sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(named, name)) {
      throw new Error(`DATABASE_PARAMETER_MISSING:${name}`);
    }
    const existing = positions.get(name);
    if (existing) return `$${existing}`;
    values.push(named[name]);
    const position = values.length;
    positions.set(name, position);
    return `$${position}`;
  });
  return { text, values };
}

function appendConflictDoNothing(sql: string): string {
  if (!/\bINSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql)) return sql;
  const replaced = sql.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/i, 'INSERT INTO').trim();
  const withoutSemicolon = replaced.endsWith(';') ? replaced.slice(0, -1) : replaced;
  return `${withoutSemicolon} ON CONFLICT DO NOTHING`;
}

export function toPostgresSql(sql: string): string {
  return appendConflictDoNothing(sql)
    .replace(
      /julianday\(([^)]+)\)\s*<\s*julianday\('now'\)/gi,
      '($1)::timestamptz < NOW()',
    )
    .replace(
      /date\(([^)]+)\)\s*<\s*date\('now'\)/gi,
      '($1)::date < CURRENT_DATE',
    )
    .replace(
      /date\(([^)]+)\)\s+BETWEEN\s+date\('now'\)\s+AND\s+date\('now',\s*'\+7 days'\)/gi,
      "($1)::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')::date",
    )
    .replace(/\bAS\s+([a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*)\b/g, 'AS "$1"');
}

function sqliteArguments(parameters: QueryParameters): unknown[] {
  return Array.isArray(parameters) ? [...parameters] : [parameters];
}

async function postgresQuery<Row extends QueryResultRow>(
  sql: string,
  parameters: QueryParameters,
) {
  const translated = postgresParameters(toPostgresSql(sql), parameters);
  const client = transactionClient.getStore();
  return client
    ? client.query<Row>(translated.text, translated.values)
    : getPostgresPool().query<Row>(translated.text, translated.values);
}

export class DataSource {
  readonly provider: DatabaseProvider =
    env.databaseProvider === 'postgres' ? 'postgres' : 'sqlite';

  async one<Row>(sql: string, parameters: QueryParameters = []): Promise<Row | undefined> {
    if (this.provider === 'postgres') {
      const result = await postgresQuery<Row & QueryResultRow>(sql, parameters);
      return result.rows[0] as Row | undefined;
    }
    const database = await getSqliteDatabase();
    return database.prepare(sql).get(...sqliteArguments(parameters)) as Row | undefined;
  }

  async many<Row>(sql: string, parameters: QueryParameters = []): Promise<Row[]> {
    if (this.provider === 'postgres') {
      const result = await postgresQuery<Row & QueryResultRow>(sql, parameters);
      return result.rows as Row[];
    }
    const database = await getSqliteDatabase();
    return database.prepare(sql).all(...sqliteArguments(parameters)) as Row[];
  }

  async execute(
    sql: string,
    parameters: QueryParameters = [],
  ): Promise<DatabaseCommandResult> {
    if (this.provider === 'postgres') {
      const result = await postgresQuery(sql, parameters);
      return { changes: result.rowCount ?? 0 };
    }
    const database = await getSqliteDatabase();
    const result = database.prepare(sql).run(...sqliteArguments(parameters));
    return { changes: result.changes };
  }

  async transaction<Result>(operation: () => Promise<Result>): Promise<Result> {
    if (this.provider === 'sqlite') {
      const database = await getSqliteDatabase();
      database.exec('BEGIN IMMEDIATE');
      try {
        const result = await operation();
        database.exec('COMMIT');
        return result;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }

    const client = await getPostgresPool().connect();
    try {
      await client.query('BEGIN');
      const result = await transactionClient.run(client, operation);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async ping(): Promise<void> {
    await this.one('SELECT 1');
  }

  async close(): Promise<void> {
    if (this.provider === 'postgres') {
      await getPostgresPool().end();
      return;
    }
    if (sqliteDatabasePromise) {
      const database = await sqliteDatabasePromise;
      if (database.open) database.close();
    }
  }
}

export const dataSource = new DataSource();
