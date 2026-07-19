import path from 'node:path';

import { env } from '../config/env';
import { createSqliteBackup } from './sqlite-operations';

const backupPath = await createSqliteBackup({
  sourcePath: env.databasePath,
  destinationDirectory: env.sqliteBackupDir,
  retention: env.sqliteBackupRetention,
});

console.log(JSON.stringify({ ok: true, backupPath: path.resolve(backupPath) }));
