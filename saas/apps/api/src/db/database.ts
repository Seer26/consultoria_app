import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { env } from '../config/env';
import { schemaStatements } from './schema';

const resolvedPath = path.resolve(process.cwd(), env.databasePath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

export const database = new Database(resolvedPath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');
database.pragma('busy_timeout = 5000');

for (const statement of schemaStatements) {
  database.exec(statement);
}
