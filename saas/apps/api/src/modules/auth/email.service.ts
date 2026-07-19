import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { buildPasswordResetEmail } from './password-reset-email.template';

export interface PasswordResetEmailInput {
  to: string;
  token: string;
  expiresInMinutes: number;
  requestId?: string;
}

export interface EmailService {
  sendPasswordReset(input: PasswordResetEmailInput): Promise<void>;
}

export interface HttpEmailProviderConfig {
  apiUrl: string;
  apiKey: string;
  from: string;
  appPublicUrl: string;
  timeoutMs: number;
  authHeader: string;
  authScheme: string;
  fields: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    messageId: string;
  };
}

const testTokens = new Map<string, string>();

class ConsoleEmailService implements EmailService {
  async sendPasswordReset(input: PasswordResetEmailInput): Promise<void> {
    const forbidden = env.nodeEnv === 'production' ||
      (env.nodeEnv === 'staging' && !env.emailAllowTestProvider);
    if (forbidden) {
      throw new Error('CONSOLE_EMAIL_PROVIDER_FORBIDDEN');
    }

    if (env.nodeEnv === 'test') {
      testTokens.set(input.to.toLowerCase(), input.token);
    }

    logger.info('email.password_reset_queued_console', {
      requestId: input.requestId,
      provider: 'console',
      recipientDomain: input.to.split('@')[1] ?? 'unknown',
      expiresInMinutes: input.expiresInMinutes,
    });
  }
}

class UnavailableEmailService implements EmailService {
  async sendPasswordReset(): Promise<void> {
    throw new Error('EMAIL_PROVIDER_CONFIGURATION_MISSING');
  }
}

export class HttpEmailService implements EmailService {
  constructor(
    private readonly config: HttpEmailProviderConfig = emailHttpConfigFromEnv(),
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async sendPasswordReset(input: PasswordResetEmailInput): Promise<void> {
    if (!this.config.apiUrl || !this.config.apiKey || !this.config.from) {
      throw new Error('EMAIL_PROVIDER_CONFIGURATION_MISSING');
    }

    const resetUrl = `${this.config.appPublicUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(input.token)}`;
    const template = buildPasswordResetEmail({
      productName: 'Consultoria SaaS',
      resetUrl,
      expiresInMinutes: input.expiresInMinutes,
    });
    const body: Record<string, string> = {
      [this.config.fields.from]: this.config.from,
      [this.config.fields.to]: input.to,
      [this.config.fields.subject]: template.subject,
      [this.config.fields.text]: template.text,
      [this.config.fields.html]: template.html,
    };
    const authorization = this.config.authScheme
      ? `${this.config.authScheme} ${this.config.apiKey}`
      : this.config.apiKey;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetcher(this.config.apiUrl, {
        method: 'POST',
        headers: {
          [this.config.authHeader]: authorization,
          'Content-Type': 'application/json',
          ...(input.requestId ? { 'X-Request-ID': input.requestId } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status >= 400 && response.status < 500) {
        throw new Error('EMAIL_PROVIDER_REJECTED');
      }
      if (response.status >= 500 || !response.ok) {
        throw new Error('EMAIL_PROVIDER_UNAVAILABLE');
      }

      let messageId: string | undefined;
      try {
        const payload = await response.json() as Record<string, unknown>;
        const candidate = payload[this.config.fields.messageId];
        messageId = typeof candidate === 'string' ? candidate : undefined;
      } catch {
        // Provider pode responder 2xx sem JSON.
      }
      logger.info('email.password_reset_sent', {
        requestId: input.requestId,
        provider: 'http',
        statusCode: response.status,
        messageId,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('EMAIL_PROVIDER_TIMEOUT');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function emailHttpConfigFromEnv(): HttpEmailProviderConfig {
  return {
    apiUrl: env.emailApiUrl,
    apiKey: env.emailApiKey,
    from: env.emailFrom,
    appPublicUrl: env.appPublicUrl,
    timeoutMs: env.emailTimeoutMs,
    authHeader: env.emailApiAuthHeader,
    authScheme: env.emailApiAuthScheme,
    fields: {
      from: env.emailApiFromField,
      to: env.emailApiToField,
      subject: env.emailApiSubjectField,
      html: env.emailApiHtmlField,
      text: env.emailApiTextField,
      messageId: env.emailApiMessageIdField,
    },
  };
}

export function getEmailProviderReadiness(): {
  status: 'ready' | 'not_ready';
  provider: string;
  reason?: string;
} {
  if (env.emailProvider === 'http') {
    const configured = Boolean(env.emailApiUrl && env.emailApiKey && env.emailFrom);
    return configured
      ? { status: 'ready', provider: 'http' }
      : { status: 'not_ready', provider: 'http', reason: 'configuration_missing' };
  }
  if (env.emailProvider === 'console') {
    const allowed = env.nodeEnv === 'development' || env.nodeEnv === 'test' ||
      (env.nodeEnv === 'staging' && env.emailAllowTestProvider);
    return allowed
      ? { status: 'ready', provider: 'console' }
      : { status: 'not_ready', provider: 'console', reason: 'test_provider_forbidden' };
  }
  return { status: 'not_ready', provider: env.emailProvider || 'none', reason: 'provider_missing' };
}

export function createEmailService(): EmailService {
  const readiness = getEmailProviderReadiness();
  if (readiness.status !== 'ready') return new UnavailableEmailService();
  if (env.emailProvider === 'console') return new ConsoleEmailService();
  if (env.emailProvider === 'http') return new HttpEmailService();
  return new UnavailableEmailService();
}

export function getPasswordResetTokenForTest(email: string): string | undefined {
  if (env.nodeEnv !== 'test') {
    throw new Error('TEST_EMAIL_CAPTURE_FORBIDDEN');
  }
  return testTokens.get(email.trim().toLowerCase());
}
