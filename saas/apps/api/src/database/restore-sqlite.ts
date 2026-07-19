import path from 'node:path';

import { env } from '../config/env';
import { restoreSqliteBackup } from './sqlite-operations';

const sourceBackupPath = process.argv.find((argument) => argument.startsWith('--source='))?.slice(9);
if (!sourceBackupPath) throw new Error('Use --source=C:\\caminho\\backup.sqlite');

const safetyBackup = await restoreSqliteBackup({
  sourceBackupPath,
  destinationPath: env.databasePath,
  confirmation: process.argv.includes('--confirm-restore'),
  allowProduction: process.argv.includes('--allow-production'),
  environment: env.nodeEnv,
});

console.log(JSON.stringify({
  ok: true,
  restoredTo: path.resolve(env.databasePath),
  safetyBackup,
}));
