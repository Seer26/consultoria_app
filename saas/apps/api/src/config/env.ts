import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const appEnv = process.env.APP_ENV?.trim().toLowerCase() || nodeEnv;
const isStaging = appEnv === 'staging';
const isRestrictedEnvironment =
  isStaging || nodeEnv === 'staging' || nodeEnv === 'production';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseCorsOrigins(value: string | undefined): string[] | '*' {
  if (!value?.trim()) {
    if (isRestrictedEnvironment) {
      throw new Error('CORS_ORIGINS_REQUIRED_IN_RESTRICTED_ENVIRONMENT');
    }

    return '*';
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parsePositiveInteger(name: string, value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name}_MUST_BE_A_POSITIVE_INTEGER`);
  }
  return parsed;
}

function resolveJwtSecret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (value) {
    return value;
  }

  if (isRestrictedEnvironment) {
    throw new Error('JWT_SECRET_REQUIRED_IN_RESTRICTED_ENVIRONMENT');
  }

  return 'consultoria-local-dev-secret';
}

const envConfig = {
  nodeEnv,
  appEnv,
  isStaging,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL?.trim() || '',
  databasePath: process.env.DATABASE_PATH ?? './data/consultoria.sqlite',
  databaseProvider: process.env.DATABASE_URL?.trim() ? 'postgres' : 'sqlite',
  sqliteBackupDir: process.env.SQLITE_BACKUP_DIR?.trim() || './backups/sqlite',
  sqliteBackupRetention: parsePositiveInteger(
    'SQLITE_BACKUP_RETENTION',
    process.env.SQLITE_BACKUP_RETENTION,
    10,
  ),
  apiReplicaCount: parsePositiveInteger(
    'API_REPLICA_COUNT',
    process.env.API_REPLICA_COUNT,
    1,
  ),
  aiApiKey: process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? '',
  aiApiUrl: process.env.AI_API_URL ?? 'https://api.openai.com/v1/responses',
  aiModel: process.env.AI_MODEL ?? 'gpt-4o-mini',
  aiQuestionModel: process.env.AI_QUESTION_MODEL ?? 'gpt-4.1-mini',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 20000),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  loginRateLimitWindowMs: parsePositiveInteger('LOGIN_RATE_LIMIT_WINDOW_MS', process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  loginRateLimitMax: parsePositiveInteger('LOGIN_RATE_LIMIT_MAX', process.env.LOGIN_RATE_LIMIT_MAX, 10),
  passwordForgotRateLimitWindowMs: parsePositiveInteger('PASSWORD_FORGOT_RATE_LIMIT_WINDOW_MS', process.env.PASSWORD_FORGOT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  passwordForgotRateLimitMax: parsePositiveInteger('PASSWORD_FORGOT_RATE_LIMIT_MAX', process.env.PASSWORD_FORGOT_RATE_LIMIT_MAX, 5),
  aiRateLimitWindowMs: parsePositiveInteger('AI_RATE_LIMIT_WINDOW_MS', process.env.AI_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  aiRateLimitMax: parsePositiveInteger('AI_RATE_LIMIT_MAX', process.env.AI_RATE_LIMIT_MAX, 12),
  pdfRateLimitWindowMs: parsePositiveInteger('PDF_RATE_LIMIT_WINDOW_MS', process.env.PDF_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  pdfRateLimitMax: parsePositiveInteger('PDF_RATE_LIMIT_MAX', process.env.PDF_RATE_LIMIT_MAX, 10),
  passwordResetTokenTtlMinutes: parsePositiveInteger('PASSWORD_RESET_TOKEN_TTL_MINUTES', process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 30),
  emailProvider: process.env.EMAIL_PROVIDER?.trim().toLowerCase() || (isRestrictedEnvironment ? '' : 'console'),
  emailFrom: process.env.EMAIL_FROM?.trim() || 'no-reply@localhost',
  appPublicUrl: process.env.APP_PUBLIC_URL?.trim() || 'http://localhost:3000',
  apiPublicUrl: process.env.API_PUBLIC_URL?.trim() || 'http://localhost:3000',
  emailApiUrl: process.env.EMAIL_API_URL?.trim() || '',
  emailApiKey: process.env.EMAIL_API_KEY?.trim() || '',
  emailTimeoutMs: parsePositiveInteger('EMAIL_TIMEOUT_MS', process.env.EMAIL_TIMEOUT_MS, 10000),
  emailAllowTestProvider: parseBoolean(process.env.EMAIL_ALLOW_TEST_PROVIDER, false),
  emailApiAuthHeader: process.env.EMAIL_API_AUTH_HEADER?.trim() || 'Authorization',
  emailApiAuthScheme: process.env.EMAIL_API_AUTH_SCHEME?.trim() ?? 'Bearer',
  emailApiFromField: process.env.EMAIL_API_FROM_FIELD?.trim() || 'from',
  emailApiToField: process.env.EMAIL_API_TO_FIELD?.trim() || 'to',
  emailApiSubjectField: process.env.EMAIL_API_SUBJECT_FIELD?.trim() || 'subject',
  emailApiHtmlField: process.env.EMAIL_API_HTML_FIELD?.trim() || 'html',
  emailApiTextField: process.env.EMAIL_API_TEXT_FIELD?.trim() || 'text',
  emailApiMessageIdField: process.env.EMAIL_API_MESSAGE_ID_FIELD?.trim() || 'id',
  enableInternalMetrics: parseBoolean(process.env.ENABLE_INTERNAL_METRICS, false),
  requireAiInReadiness: parseBoolean(process.env.REQUIRE_AI_IN_READINESS, false),
  requireLegalAcceptance: parseBoolean(process.env.REQUIRE_LEGAL_ACCEPTANCE, false),
  logFormat: process.env.LOG_FORMAT?.trim().toLowerCase() || 'json',
  enableExternalAlerts: parseBoolean(
    process.env.ENABLE_EXTERNAL_ALERTS ?? process.env.EXTERNAL_ALERTS_ENABLED,
    false,
  ),
  alertWebhookUrl:
    process.env.ALERT_WEBHOOK_URL?.trim() ||
    process.env.EXTERNAL_ALERTS_URL?.trim() ||
    '',
  alertWebhookTimeoutMs: parsePositiveInteger(
    'ALERT_WEBHOOK_TIMEOUT_MS',
    process.env.ALERT_WEBHOOK_TIMEOUT_MS,
    3000,
  ),
  externalBackupProvider:
    process.env.BACKUP_EXTERNAL_PROVIDER?.trim().toLowerCase() || 'none',
  externalBackupDirectory:
    process.env.BACKUP_EXTERNAL_DIRECTORY?.trim() || '',
  termsVersion: process.env.TERMS_VERSION?.trim() || 'beta-draft-v1',
  privacyVersion: process.env.PRIVACY_VERSION?.trim() || 'beta-draft-v1',
  demoSeedEnabled:
    isRestrictedEnvironment
      ? false
      : parseBoolean(process.env.ENABLE_DEMO_SEED, false),
};

const weakSecretPatterns = [
  'replace-with',
  'change-me',
  'consultoria-local',
  'secret',
];

function isSecureHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

function requireExplicit(rawEnv: NodeJS.ProcessEnv, names: string[]): void {
  for (const name of names) {
    if (rawEnv[name] == null || rawEnv[name]?.trim() === '') {
      throw new Error(`${name}_MUST_BE_EXPLICIT_IN_STAGING`);
    }
  }
}

export function validateStagingProfile(
  config: typeof envConfig = envConfig,
  rawEnv: NodeJS.ProcessEnv = process.env,
): void {
  if (!config.isStaging) return;

  requireExplicit(rawEnv, [
    'ENABLE_DEMO_SEED',
    'EMAIL_ALLOW_TEST_PROVIDER',
    'ENABLE_INTERNAL_METRICS',
    'REQUIRE_AI_IN_READINESS',
    'REQUIRE_LEGAL_ACCEPTANCE',
    'API_REPLICA_COUNT',
    'SQLITE_VOLUME_ACK',
    'LOG_FORMAT',
  ]);
  if (
    (rawEnv.ENABLE_EXTERNAL_ALERTS == null ||
      rawEnv.ENABLE_EXTERNAL_ALERTS.trim() === '') &&
    (rawEnv.EXTERNAL_ALERTS_ENABLED == null ||
      rawEnv.EXTERNAL_ALERTS_ENABLED.trim() === '')
  ) {
    throw new Error(
      'ENABLE_EXTERNAL_ALERTS_OR_EXTERNAL_ALERTS_ENABLED_MUST_BE_EXPLICIT_IN_STAGING',
    );
  }

  if (config.nodeEnv !== 'production') {
    throw new Error('STAGING_REQUIRES_NODE_ENV_PRODUCTION');
  }
  if (config.databaseProvider !== 'sqlite') {
    throw new Error('STAGING_RUNTIME_MUST_REMAIN_SQLITE');
  }
  if (!path.isAbsolute(config.databasePath)) {
    throw new Error('STAGING_DATABASE_PATH_MUST_BE_ABSOLUTE');
  }
  if (!path.isAbsolute(config.sqliteBackupDir)) {
    throw new Error('STAGING_BACKUP_DIRECTORY_MUST_BE_ABSOLUTE');
  }
  if (
    path.dirname(path.resolve(config.databasePath)) ===
    path.resolve(config.sqliteBackupDir)
  ) {
    throw new Error('STAGING_BACKUP_DIRECTORY_MUST_DIFFER_FROM_DATABASE_DIRECTORY');
  }
  if (rawEnv.SQLITE_VOLUME_ACK !== 'single-instance-persistent-volume') {
    throw new Error('STAGING_SQLITE_PERSISTENT_VOLUME_ACK_REQUIRED');
  }
  if (config.apiReplicaCount !== 1) {
    throw new Error('SQLITE_STAGING_REQUIRES_EXACTLY_ONE_API_REPLICA');
  }
  if (rawEnv.ENABLE_DEMO_SEED?.trim().toLowerCase() !== 'false') {
    throw new Error('STAGING_DEMO_SEED_MUST_BE_FALSE');
  }
  if (!isSecureHttpsUrl(config.appPublicUrl)) {
    throw new Error('STAGING_APP_PUBLIC_URL_MUST_BE_HTTPS');
  }
  if (!isSecureHttpsUrl(config.apiPublicUrl)) {
    throw new Error('STAGING_API_PUBLIC_URL_MUST_BE_HTTPS');
  }
  if (
    config.corsOrigins === '*' ||
    config.corsOrigins.length === 0 ||
    config.corsOrigins.some((origin) => !isSecureHttpsUrl(origin))
  ) {
    throw new Error('STAGING_CORS_ORIGINS_MUST_BE_EXPLICIT_HTTPS');
  }
  if (
    config.jwtSecret.length < 32 ||
    weakSecretPatterns.some((pattern) =>
      config.jwtSecret.toLowerCase().includes(pattern))
  ) {
    throw new Error('STAGING_JWT_SECRET_MUST_BE_STRONG');
  }
  if (
    config.emailProvider !== 'http' ||
    !isSecureHttpsUrl(config.emailApiUrl) ||
    !config.emailApiKey ||
    !config.emailFrom.includes('@') ||
    config.emailFrom.endsWith('@localhost') ||
    config.emailAllowTestProvider
  ) {
    throw new Error('STAGING_REAL_EMAIL_PROVIDER_CONFIGURATION_REQUIRED');
  }
  if (!config.enableInternalMetrics) {
    throw new Error('STAGING_ADMIN_METRICS_MUST_BE_ENABLED');
  }
  if (!config.requireLegalAcceptance) {
    throw new Error('STAGING_LEGAL_ACCEPTANCE_MUST_BE_ENABLED');
  }
  if (config.logFormat !== 'json') {
    throw new Error('STAGING_LOG_FORMAT_MUST_BE_JSON');
  }
  if (config.requireAiInReadiness && !config.aiApiKey) {
    throw new Error('STAGING_OPENAI_CONFIGURATION_REQUIRED_BY_POLICY');
  }
  if (
    config.enableExternalAlerts &&
    !isSecureHttpsUrl(config.alertWebhookUrl)
  ) {
    throw new Error('STAGING_ALERT_WEBHOOK_MUST_BE_HTTPS');
  }
}

export function validateLocalOperationalProfile(
  config: typeof envConfig = envConfig,
  rawEnv: NodeJS.ProcessEnv = process.env,
): void {
  if (config.appEnv !== 'local') return;

  if (config.nodeEnv !== 'development') {
    throw new Error('LOCAL_OPERATIONAL_PROFILE_REQUIRES_NODE_ENV_DEVELOPMENT');
  }
  if (rawEnv.ENABLE_DEMO_SEED?.trim().toLowerCase() !== 'false') {
    throw new Error('LOCAL_OPERATIONAL_PROFILE_REQUIRES_DEMO_SEED_FALSE');
  }
  if (config.databaseProvider !== 'sqlite') {
    throw new Error('LOCAL_OPERATIONAL_PROFILE_REQUIRES_SQLITE');
  }
  if (!rawEnv.DATABASE_PATH?.trim() || !path.isAbsolute(config.databasePath)) {
    throw new Error('LOCAL_OPERATIONAL_DATABASE_PATH_MUST_BE_EXPLICIT_AND_ABSOLUTE');
  }

  const databaseFilename = path.basename(config.databasePath).toLowerCase();
  if (/(demo|e2e|test|staging)/.test(databaseFilename)) {
    throw new Error('LOCAL_OPERATIONAL_DATABASE_PATH_REJECTED');
  }
}

validateLocalOperationalProfile();
validateStagingProfile();

export const env = envConfig;
