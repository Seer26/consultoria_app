import { env } from '../config/env';

export interface ExternalAlert {
  code: string;
  severity: 'warn' | 'error';
  timestamp: string;
  environment: string;
  requestId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
}

export interface AlertSink {
  send(alert: ExternalAlert): Promise<void>;
}

export class HttpAlertSink implements AlertSink {
  constructor(
    private readonly url: string,
    private readonly timeoutMs: number,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(alert: ExternalAlert): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('ALERT_RECEIVER_REJECTED');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function buildExternalAlert(
  code: string,
  severity: 'warn' | 'error',
  context: Record<string, unknown>,
  environment = env.appEnv,
): ExternalAlert {
  const statusCode =
    typeof context.statusCode === 'number' ? context.statusCode : undefined;
  return {
    code,
    severity,
    timestamp: new Date().toISOString(),
    environment,
    requestId:
      typeof context.requestId === 'string' ? context.requestId : undefined,
    method: typeof context.method === 'string' ? context.method : undefined,
    route: typeof context.route === 'string' ? context.route : undefined,
    statusCode,
  };
}

export async function deliverExternalAlert(
  sink: AlertSink,
  alert: ExternalAlert,
): Promise<boolean> {
  try {
    await sink.send(alert);
    return true;
  } catch {
    // Falha externa nunca bloqueia nem gera outro alerta, evitando loops.
    return false;
  }
}

export function dispatchExternalAlert(
  code: string,
  severity: 'warn' | 'error',
  context: Record<string, unknown>,
): void {
  if (!env.enableExternalAlerts || !env.alertWebhookUrl) return;
  const sink = new HttpAlertSink(
    env.alertWebhookUrl,
    env.alertWebhookTimeoutMs,
  );
  void deliverExternalAlert(sink, buildExternalAlert(code, severity, context));
}
