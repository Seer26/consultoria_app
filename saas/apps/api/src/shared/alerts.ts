import { logger } from './logger';
import { dispatchExternalAlert } from './external-alerts';

export type AlertSeverity = 'warn' | 'error';

export function operationalAlert(
  code: string,
  severity: AlertSeverity,
  context: Record<string, unknown> = {},
): void {
  const payload = {
    alertCode: code,
    alertSeverity: severity,
    ...context,
  };
  if (severity === 'error') {
    logger.error(`alert.${code}`, payload);
  } else {
    logger.warn(`alert.${code}`, payload);
  }
  dispatchExternalAlert(code, severity, context);
}
