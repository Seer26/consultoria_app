import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'consultoria-staging-data-'));
const databasePath = path.join(tempRoot, 'data', 'staging.sqlite');
const secrets = {
  adminEmail: 'admin.synthetic@example.invalid',
  adminPassword: 'A9!synthetic-admin-password',
  ownerEmail: 'owner.synthetic@example.invalid',
  ownerPassword: 'B8!synthetic-owner-password',
  employeeEmail: 'employee.synthetic@example.invalid',
  employeePassword: 'C7!synthetic-employee-password',
};
const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  ENABLE_DEMO_SEED: 'false',
  DATABASE_URL: '',
  DATABASE_PATH: databasePath,
};

function run(script: string, extraEnv: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ['--import', 'tsx', script], {
    cwd: process.cwd(),
    env: { ...baseEnv, ...extraEnv },
    encoding: 'utf8',
  });
}

try {
  const refusedSeed = run('src/database/staging-seed.ts', {});
  assert.notEqual(refusedSeed.status, 0);
  assert.match(
    `${refusedSeed.stdout}${refusedSeed.stderr}`,
    /STAGING_SEED_EXPLICIT_CONFIRMATION_REQUIRED/,
  );
  assert.equal(fs.existsSync(databasePath), false);

  const seed = run('src/database/staging-seed.ts', {
    STAGING_SEED_CONFIRMATION: 'create-consultoria-staging-synthetic-data',
    STAGING_SEED_ADMIN_EMAIL: secrets.adminEmail,
    STAGING_SEED_ADMIN_PASSWORD: secrets.adminPassword,
    STAGING_SEED_OWNER_EMAIL: secrets.ownerEmail,
    STAGING_SEED_OWNER_PASSWORD: secrets.ownerPassword,
    STAGING_SEED_EMPLOYEE_EMAIL: secrets.employeeEmail,
    STAGING_SEED_EMPLOYEE_PASSWORD: secrets.employeePassword,
  });
  assert.equal(seed.status, 0, seed.stderr);
  const seedOutput = `${seed.stdout}${seed.stderr}`;
  Object.values(secrets).forEach((secret) => assert.doesNotMatch(seedOutput, new RegExp(secret)));

  const database = new Database(databasePath, { readonly: true });
  assert.equal(
    (
      database.prepare(
        `SELECT COUNT(*) AS quantity FROM users
         WHERE id LIKE 'staging-synthetic-%'`,
      ).get() as { quantity: number }
    ).quantity,
    3,
  );
  assert.equal(
    (
      database.prepare(
        `SELECT COUNT(*) AS quantity FROM diagnosis_submissions
         WHERE id = 'staging-synthetic-submission' AND status = 'COMPLETED'`,
      ).get() as { quantity: number }
    ).quantity,
    1,
  );
  assert.equal(
    (
      database.prepare(
        `SELECT COUNT(*) AS quantity FROM action_plan_tasks
         WHERE id LIKE 'staging-synthetic-%'`,
      ).get() as { quantity: number }
    ).quantity,
    2,
  );
  database.close();

  const seedAgain = run('src/database/staging-seed.ts', {
    STAGING_SEED_CONFIRMATION: 'create-consultoria-staging-synthetic-data',
    STAGING_SEED_ADMIN_EMAIL: secrets.adminEmail,
    STAGING_SEED_ADMIN_PASSWORD: secrets.adminPassword,
    STAGING_SEED_OWNER_EMAIL: secrets.ownerEmail,
    STAGING_SEED_OWNER_PASSWORD: secrets.ownerPassword,
    STAGING_SEED_EMPLOYEE_EMAIL: secrets.employeeEmail,
    STAGING_SEED_EMPLOYEE_PASSWORD: secrets.employeePassword,
  });
  assert.equal(seedAgain.status, 0, seedAgain.stderr);

  const refusedCleanup = run('src/database/staging-cleanup.ts', {});
  assert.notEqual(refusedCleanup.status, 0);
  assert.match(
    `${refusedCleanup.stdout}${refusedCleanup.stderr}`,
    /STAGING_CLEANUP_EXPLICIT_CONFIRMATION_REQUIRED/,
  );

  const cleanup = run('src/database/staging-cleanup.ts', {
    STAGING_CLEANUP_CONFIRMATION:
      'delete-only-consultoria-staging-synthetic-data',
  });
  assert.equal(cleanup.status, 0, cleanup.stderr);

  const cleanedDatabase = new Database(databasePath, { readonly: true });
  assert.equal(
    (
      cleanedDatabase.prepare(
        `SELECT COUNT(*) AS quantity FROM companies
         WHERE id = 'staging-synthetic-company'`,
      ).get() as { quantity: number }
    ).quantity,
    0,
  );
  cleanedDatabase.close();

  const productionRefusal = run('src/database/staging-cleanup.ts', {
    APP_ENV: 'production',
    STAGING_CLEANUP_CONFIRMATION:
      'delete-only-consultoria-staging-synthetic-data',
  });
  assert.notEqual(productionRefusal.status, 0);
  assert.match(
    `${productionRefusal.stdout}${productionRefusal.stderr}`,
    /STAGING_DATA_COMMAND_REQUIRES_APP_ENV_STAGING/,
  );

  console.log(JSON.stringify({
    ok: true,
    explicitSeedGuardChecked: true,
    idempotentSyntheticSeedChecked: true,
    secretOutputGuardChecked: true,
    exactCleanupChecked: true,
    productionRefusalChecked: true,
  }));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
