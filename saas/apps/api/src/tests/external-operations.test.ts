import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';

import {
  createExternalSqliteBackup,
  FilesystemBackupDestination,
} from '../database/external-backup';
import {
  buildExternalAlert,
  deliverExternalAlert,
  HttpAlertSink,
} from '../shared/external-alerts';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'consultoria-external-ops-'));
const databasePath = path.join(root, 'data', 'source.sqlite');
const localBackupDirectory = path.join(root, 'local-backups');
const externalDirectory = path.join(root, 'external-mount');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.exec('CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
database.prepare('INSERT INTO sample (value) VALUES (?)').run('backup externo falso');
database.close();

const requests: Array<Record<string, unknown>> = [];
const receiver = http.createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  request.on('end', () => {
    requests.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    response.writeHead(202, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ accepted: true }));
  });
});

try {
  const backup = await createExternalSqliteBackup({
    sourcePath: databasePath,
    localBackupDirectory,
    destination: new FilesystemBackupDestination(externalDirectory),
    retention: 2,
  });
  assert.equal(fs.existsSync(backup.externalLocation), true);
  const manifest = JSON.parse(
    fs.readFileSync(`${backup.externalLocation}.manifest.json`, 'utf8'),
  ) as { sha256: string; sizeBytes: number };
  assert.equal(manifest.sha256, backup.sha256);
  assert.equal(manifest.sizeBytes, backup.sizeBytes);

  await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
  const address = receiver.address();
  assert(address && typeof address !== 'string');
  const sink = new HttpAlertSink(
    `http://127.0.0.1:${address.port}/alerts`,
    1000,
  );
  const alert = buildExternalAlert('fake_alert', 'warn', {
    requestId: 'request-fake-123',
    route: '/ready',
    statusCode: 503,
    token: 'nao-enviar',
    email: 'nao-enviar@teste.com',
  }, 'test');
  assert.equal(await deliverExternalAlert(sink, alert), true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].code, 'fake_alert');
  assert.equal(requests[0].requestId, 'request-fake-123');
  assert.equal('token' in requests[0], false);
  assert.equal('email' in requests[0], false);

  await new Promise<void>((resolve, reject) =>
    receiver.close((error) => error ? reject(error) : resolve()));
  assert.equal(await deliverExternalAlert(sink, alert), false);

  console.log(JSON.stringify({
    ok: true,
    externalBackupFakeChecked: true,
    checksumManifestChecked: true,
    localAlertReceiverChecked: true,
    alertFailureNonBlockingChecked: true,
  }));
} finally {
  if (receiver.listening) {
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
  }
  fs.rmSync(root, { recursive: true, force: true });
}
