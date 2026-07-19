import assert from 'node:assert/strict';

import { validatePasswordPolicy } from '../modules/auth/password-policy';
import { sanitizeForLog } from '../shared/logger';
import { operationalAlert } from '../shared/alerts';
import { env, validateLocalOperationalProfile } from '../config/env';

function main(): void {
  assert.equal(validatePasswordPolicy('SenhaBeta123', 'owner@empresa.com').valid, true);
  assert.equal(validatePasswordPolicy('12345678').errors.includes('PASSWORD_ONLY_NUMBERS'), true);
  assert.equal(validatePasswordPolicy('curta1').errors.includes('PASSWORD_MIN_LENGTH'), true);
  assert.equal(validatePasswordPolicy('owner@empresa.com', 'owner@empresa.com').errors.includes('PASSWORD_EQUALS_EMAIL'), true);
  assert.equal(validatePasswordPolicy('password').errors.includes('PASSWORD_TOO_COMMON'), true);

  const sanitized = sanitizeForLog({
    email: 'owner@empresa.com',
    password: 'nao-deve-aparecer',
    nested: { token: 'jwt-secreto', apiKey: 'chave-secreta' },
  }) as Record<string, unknown>;
  assert.equal(sanitized.password, '[REDACTED]');
  assert.deepEqual(sanitized.nested, {
    token: '[REDACTED]',
    apiKey: '[REDACTED]',
  });

  const originalWarn = console.warn;
  let alertOutput = '';
  try {
    console.warn = (message?: unknown) => { alertOutput = String(message ?? ''); };
    operationalAlert('unit_test_alert', 'warn', { token: 'nao-expor' });
  } finally {
    console.warn = originalWarn;
  }
  const parsedAlert = JSON.parse(alertOutput) as Record<string, unknown>;
  assert.equal(parsedAlert.alertCode, 'unit_test_alert');
  assert.equal(parsedAlert.alertSeverity, 'warn');
  assert.equal(parsedAlert.token, '[REDACTED]');

  const localConfig = {
    ...env,
    nodeEnv: 'development',
    appEnv: 'local',
    databaseProvider: 'sqlite' as const,
    databasePath: 'C:\\data\\consultoria.sqlite',
    demoSeedEnabled: false,
  };
  assert.doesNotThrow(() =>
    validateLocalOperationalProfile(localConfig, {
      NODE_ENV: 'development',
      APP_ENV: 'local',
      ENABLE_DEMO_SEED: 'false',
      DATABASE_PATH: 'C:\\data\\consultoria.sqlite',
    }),
  );
  assert.throws(
    () =>
      validateLocalOperationalProfile(
        { ...localConfig, databasePath: 'C:\\data\\consultoria-demo.sqlite' },
        {
          NODE_ENV: 'development',
          APP_ENV: 'local',
          ENABLE_DEMO_SEED: 'false',
          DATABASE_PATH: 'C:\\data\\consultoria-demo.sqlite',
        },
      ),
    /LOCAL_OPERATIONAL_DATABASE_PATH_REJECTED/,
  );
  assert.throws(
    () =>
      validateLocalOperationalProfile(localConfig, {
        NODE_ENV: 'development',
        APP_ENV: 'local',
        ENABLE_DEMO_SEED: 'true',
        DATABASE_PATH: 'C:\\data\\consultoria.sqlite',
      }),
    /LOCAL_OPERATIONAL_PROFILE_REQUIRES_DEMO_SEED_FALSE/,
  );

  console.log(JSON.stringify({
    ok: true,
    passwordPolicyChecked: true,
    cases: 7,
    logSanitizationChecked: true,
    operationalAlertChecked: true,
    localOperationalProfileChecked: true,
  }));
}

main();
