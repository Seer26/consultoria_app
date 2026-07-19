import { env } from '../config/env';
import {
  createExternalSqliteBackup,
  externalBackupDestinationFromEnv,
} from './external-backup';

const result = await createExternalSqliteBackup({
  sourcePath: env.databasePath,
  localBackupDirectory: env.sqliteBackupDir,
  destination: externalBackupDestinationFromEnv(),
  retention: env.sqliteBackupRetention,
});

console.log(JSON.stringify({
  ok: true,
  fileName: result.fileName,
  sizeBytes: result.sizeBytes,
  sha256: result.sha256,
}));
