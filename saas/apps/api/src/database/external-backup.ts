import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { env } from '../config/env';
import { operationalAlert } from '../shared/alerts';
import { logger } from '../shared/logger';
import { createSqliteBackup, validateSqliteFile } from './sqlite-operations';

export interface BackupArtifact {
  fileName: string;
  sourcePath: string;
  sha256: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackupDestination {
  store(artifact: BackupArtifact): Promise<{ location: string }>;
  applyRetention(retention: number): Promise<void>;
}

export class FilesystemBackupDestination implements BackupDestination {
  constructor(private readonly destinationDirectory: string) {}

  async store(artifact: BackupArtifact): Promise<{ location: string }> {
    const resolvedDirectory = path.resolve(this.destinationDirectory);
    const resolvedSource = path.resolve(artifact.sourcePath);
    if (resolvedDirectory === path.dirname(resolvedSource)) {
      throw new Error('EXTERNAL_BACKUP_DIRECTORY_MUST_DIFFER_FROM_LOCAL_BACKUP_DIRECTORY');
    }
    fs.mkdirSync(resolvedDirectory, { recursive: true });
    const destinationPath = path.join(resolvedDirectory, artifact.fileName);
    fs.copyFileSync(resolvedSource, destinationPath);
    validateSqliteFile(destinationPath);
    if (checksum(destinationPath) !== artifact.sha256) {
      fs.rmSync(destinationPath, { force: true });
      throw new Error('EXTERNAL_BACKUP_CHECKSUM_MISMATCH');
    }
    fs.writeFileSync(
      `${destinationPath}.manifest.json`,
      JSON.stringify({
        fileName: artifact.fileName,
        sha256: artifact.sha256,
        sizeBytes: artifact.sizeBytes,
        createdAt: artifact.createdAt,
      }, null, 2),
      { encoding: 'utf8', flag: 'wx' },
    );
    return { location: destinationPath };
  }

  async applyRetention(retention: number): Promise<void> {
    const resolvedDirectory = path.resolve(this.destinationDirectory);
    if (!fs.existsSync(resolvedDirectory)) return;
    const backups = fs.readdirSync(resolvedDirectory)
      .filter((name) => name.endsWith('.backup.sqlite'))
      .map((name) => {
        const filePath = path.join(resolvedDirectory, name);
        return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const backup of backups.slice(Math.max(1, retention))) {
      fs.rmSync(backup.filePath, { force: true });
      fs.rmSync(`${backup.filePath}.manifest.json`, { force: true });
    }
  }
}

function checksum(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export async function createExternalSqliteBackup(options: {
  sourcePath: string;
  localBackupDirectory: string;
  destination: BackupDestination;
  retention?: number;
}): Promise<BackupArtifact & { externalLocation: string }> {
  try {
    const localPath = await createSqliteBackup({
      sourcePath: options.sourcePath,
      destinationDirectory: options.localBackupDirectory,
      retention: options.retention,
    });
    const stat = fs.statSync(localPath);
    const artifact: BackupArtifact = {
      fileName: path.basename(localPath),
      sourcePath: localPath,
      sha256: checksum(localPath),
      sizeBytes: stat.size,
      createdAt: new Date().toISOString(),
    };
    const stored = await options.destination.store(artifact);
    await options.destination.applyRetention(options.retention ?? 10);
    logger.info('sqlite.external_backup_completed', {
      fileName: artifact.fileName,
      sizeBytes: artifact.sizeBytes,
      sha256: artifact.sha256,
      provider: 'filesystem',
    });
    return { ...artifact, externalLocation: stored.location };
  } catch (error) {
    operationalAlert('backup_failure', 'error', {
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    });
    throw error;
  }
}

export function externalBackupDestinationFromEnv(): BackupDestination {
  if (
    env.externalBackupProvider !== 'filesystem' ||
    !env.externalBackupDirectory
  ) {
    throw new Error('EXTERNAL_BACKUP_PROVIDER_NOT_CONFIGURED');
  }
  return new FilesystemBackupDestination(env.externalBackupDirectory);
}
