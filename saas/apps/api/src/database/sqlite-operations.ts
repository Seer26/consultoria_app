import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export interface SqliteBackupOptions {
  sourcePath: string;
  destinationDirectory: string;
  retention?: number;
  now?: Date;
}

export interface SqliteRestoreOptions {
  sourceBackupPath: string;
  destinationPath: string;
  confirmation: boolean;
  allowProduction?: boolean;
  environment?: string;
}

function resolveFile(filePath: string): string {
  return path.resolve(filePath);
}

export function validateSqliteFile(filePath: string): void {
  const resolved = resolveFile(filePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`SQLITE_FILE_NOT_FOUND: ${resolved}`);
  }

  const database = new Database(resolved, { readonly: true, fileMustExist: true });
  try {
    const result = database.pragma('quick_check', { simple: true });
    if (result !== 'ok') throw new Error(`SQLITE_INTEGRITY_CHECK_FAILED: ${String(result)}`);
  } finally {
    database.close();
  }
}

export async function createSqliteBackup(options: SqliteBackupOptions): Promise<string> {
  const sourcePath = resolveFile(options.sourcePath);
  const destinationDirectory = path.resolve(options.destinationDirectory);
  validateSqliteFile(sourcePath);
  fs.mkdirSync(destinationDirectory, { recursive: true });

  const sourceDirectory = path.dirname(sourcePath);
  if (destinationDirectory === sourceDirectory) {
    throw new Error('BACKUP_DIRECTORY_MUST_DIFFER_FROM_DATABASE_DIRECTORY');
  }

  const timestamp = (options.now ?? new Date()).toISOString().replace(/[:.]/g, '-');
  const destinationPath = path.join(destinationDirectory, `consultoria-${timestamp}.backup.sqlite`);
  const database = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try {
    await database.backup(destinationPath);
  } finally {
    database.close();
  }
  validateSqliteFile(destinationPath);

  const retention = Math.max(1, options.retention ?? 10);
  const backups = fs.readdirSync(destinationDirectory)
    .filter((name) => name.endsWith('.backup.sqlite'))
    .map((name) => ({ name, path: path.join(destinationDirectory, name) }))
    .sort((a, b) => fs.statSync(b.path).mtimeMs - fs.statSync(a.path).mtimeMs);
  for (const oldBackup of backups.slice(retention)) fs.rmSync(oldBackup.path, { force: true });

  return destinationPath;
}

export async function restoreSqliteBackup(options: SqliteRestoreOptions): Promise<string | null> {
  if (!options.confirmation) throw new Error('RESTORE_CONFIRMATION_REQUIRED');
  if (options.environment === 'production' && !options.allowProduction) {
    throw new Error('PRODUCTION_RESTORE_REQUIRES_EXPLICIT_AUTHORIZATION');
  }

  const sourceBackupPath = resolveFile(options.sourceBackupPath);
  const destinationPath = resolveFile(options.destinationPath);
  if (sourceBackupPath === destinationPath) throw new Error('RESTORE_SOURCE_EQUALS_DESTINATION');
  validateSqliteFile(sourceBackupPath);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

  let safetyBackup: string | null = null;
  if (fs.existsSync(destinationPath)) {
    validateSqliteFile(destinationPath);
    safetyBackup = `${destinationPath}.${new Date().toISOString().replace(/[:.]/g, '-')}.pre-restore.sqlite`;
    fs.copyFileSync(destinationPath, safetyBackup);
  }

  fs.copyFileSync(sourceBackupPath, destinationPath);
  validateSqliteFile(destinationPath);
  return safetyBackup;
}
