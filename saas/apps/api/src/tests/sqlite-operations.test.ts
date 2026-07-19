import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';

import { createSqliteBackup, restoreSqliteBackup } from '../database/sqlite-operations';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'consultoria-sqlite-ops-'));
const databasePath = path.join(root, 'data', 'test.sqlite');
const backupDirectory = path.join(root, 'backups');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

try {
  const database = new Database(databasePath);
  database.exec('CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
  database.prepare('INSERT INTO sample (value) VALUES (?)').run('original');
  database.close();

  const backupPath = await createSqliteBackup({
    sourcePath: databasePath,
    destinationDirectory: backupDirectory,
    retention: 2,
  });
  assert.equal(fs.existsSync(backupPath), true);

  const changed = new Database(databasePath);
  changed.prepare('UPDATE sample SET value = ? WHERE id = 1').run('alterado');
  changed.close();

  await assert.rejects(
    restoreSqliteBackup({
      sourceBackupPath: backupPath,
      destinationPath: databasePath,
      confirmation: false,
    }),
    /RESTORE_CONFIRMATION_REQUIRED/,
  );
  await assert.rejects(
    restoreSqliteBackup({
      sourceBackupPath: backupPath,
      destinationPath: databasePath,
      confirmation: true,
      environment: 'production',
    }),
    /PRODUCTION_RESTORE_REQUIRES_EXPLICIT_AUTHORIZATION/,
  );

  const safetyBackup = await restoreSqliteBackup({
    sourceBackupPath: backupPath,
    destinationPath: databasePath,
    confirmation: true,
    environment: 'test',
  });
  assert.equal(Boolean(safetyBackup && fs.existsSync(safetyBackup)), true);
  const restored = new Database(databasePath, { readonly: true });
  assert.equal((restored.prepare('SELECT value FROM sample WHERE id = 1').get() as { value: string }).value, 'original');
  restored.close();

  console.log(JSON.stringify({ ok: true, backupCreated: true, restoreValidated: true }));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
