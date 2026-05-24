import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../config/env';
import { schemaStatements } from './schema';
const resolvedPath = path.resolve(process.cwd(), env.databasePath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
export const database = new Database(resolvedPath);
for (const statement of schemaStatements) {
    database.exec(statement);
}
