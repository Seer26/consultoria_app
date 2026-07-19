import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoot = path.resolve(process.cwd(), '../..');
const dockerfile = fs.readFileSync(
  path.join(process.cwd(), 'Dockerfile'),
  'utf8',
);
const dockerignore = fs.readFileSync(
  path.join(workspaceRoot, '.dockerignore'),
  'utf8',
);
const nginx = fs.readFileSync(
  path.resolve(workspaceRoot, '../deploy/staging/flutter-web/nginx.conf'),
  'utf8',
);
const serverSource = fs.readFileSync(
  path.join(process.cwd(), 'src', 'server.ts'),
  'utf8',
);

assert.match(dockerfile, /FROM node:22-alpine AS build/);
assert.match(dockerfile, /npm ci --omit=dev/);
assert.match(dockerfile, /USER node/);
assert.match(dockerfile, /HEALTHCHECK/);
assert.match(dockerfile, /STOPSIGNAL SIGTERM/);
assert.doesNotMatch(dockerfile, /COPY .*\.env/);
assert.doesNotMatch(dockerfile, /COPY .*consultoria\.sqlite/);
assert.match(dockerignore, /\*\*\/\*\.sqlite/);
assert.match(dockerignore, /\.env\.\*/);
assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html/);
assert.match(serverSource, /process\.once\('SIGTERM'/);
assert.match(serverSource, /process\.once\('SIGINT'/);
assert.match(serverSource, /server\.close/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'consultoria-staging-profile-'));
const validEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  DATABASE_URL: '',
  DATABASE_PATH: path.join(tempRoot, 'data', 'consultoria.sqlite'),
  SQLITE_BACKUP_DIR: path.join(tempRoot, 'backups'),
  SQLITE_BACKUP_RETENTION: '10',
  SQLITE_VOLUME_ACK: 'single-instance-persistent-volume',
  API_REPLICA_COUNT: '1',
  ENABLE_DEMO_SEED: 'false',
  JWT_SECRET: 'StagingOnly-Strong-Key-0123456789-ABCDEF',
  CORS_ORIGINS: 'https://app-staging.example.invalid',
  APP_PUBLIC_URL: 'https://app-staging.example.invalid',
  API_PUBLIC_URL: 'https://api-staging.example.invalid',
  EMAIL_PROVIDER: 'http',
  EMAIL_ALLOW_TEST_PROVIDER: 'false',
  EMAIL_FROM: 'no-reply@example.invalid',
  EMAIL_API_URL: 'https://email-staging.example.invalid/send',
  EMAIL_API_KEY: 'fake-key-only-for-local-profile-validation',
  ENABLE_INTERNAL_METRICS: 'true',
  REQUIRE_AI_IN_READINESS: 'false',
  REQUIRE_LEGAL_ACCEPTANCE: 'true',
  ENABLE_EXTERNAL_ALERTS: 'false',
  LOG_FORMAT: 'json',
  OPENAI_API_KEY: '',
};

function importEnv(environment: NodeJS.ProcessEnv) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', "await import('./src/config/env.ts')"],
    {
      cwd: process.cwd(),
      env: environment,
      encoding: 'utf8',
    },
  );
}

try {
  const valid = importEnv(validEnv);
  assert.equal(valid.status, 0, valid.stderr);

  const invalidReplica = importEnv({ ...validEnv, API_REPLICA_COUNT: '2' });
  assert.notEqual(invalidReplica.status, 0);
  assert.match(
    `${invalidReplica.stdout}${invalidReplica.stderr}`,
    /SQLITE_STAGING_REQUIRES_EXACTLY_ONE_API_REPLICA/,
  );

  const invalidLocalhost = importEnv({
    ...validEnv,
    API_PUBLIC_URL: 'http://localhost:3000',
  });
  assert.notEqual(invalidLocalhost.status, 0);
  assert.match(
    `${invalidLocalhost.stdout}${invalidLocalhost.stderr}`,
    /STAGING_API_PUBLIC_URL_MUST_BE_HTTPS/,
  );

  const smokeGuard = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'src/tests/staging-smoke.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        STAGING_API_URL: '',
        STAGING_EXPECTED_HOST: '',
      },
      encoding: 'utf8',
    },
  );
  assert.notEqual(smokeGuard.status, 0);
  assert.match(
    `${smokeGuard.stdout}${smokeGuard.stderr}`,
    /STAGING_API_URL_AND_EXPECTED_HOST_REQUIRED/,
  );

  console.log(JSON.stringify({
    ok: true,
    dockerfileStaticValidationChecked: true,
    gracefulShutdownHandlersStaticChecked: true,
    flutterSpaFallbackChecked: true,
    stagingValidProfileChecked: true,
    stagingReplicaGuardChecked: true,
    stagingLocalhostGuardChecked: true,
    externalSmokeGuardChecked: true,
  }));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
