import { logger } from './logger';
import { metrics } from './metrics';
import { operationalAlert } from './alerts';

type AuditContext = Record<string, unknown>;

export function audit(event: string, context: AuditContext = {}): void {
  metrics.recordAudit(event);
  if (event.endsWith('rate_limit_blocked')) operationalAlert('rate_limit_triggered', 'warn', context);
  if (event === 'password_reset_email_failed') operationalAlert('email_provider_failure', 'error', context);
  if (event === 'ai_error') operationalAlert('ai_provider_failure', 'warn', context);
  if (event === 'report_pdf_failed') operationalAlert('pdf_generation_failure', 'warn', context);
  logger.info(`audit.${event}`, {
    auditEvent: event,
    ...context,
  });
}
