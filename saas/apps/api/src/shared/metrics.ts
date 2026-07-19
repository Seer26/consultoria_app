interface MetricCounters {
  requests: number;
  responses2xx: number;
  responses4xx: number;
  responses5xx: number;
  totalDurationMs: number;
  loginRefused: number;
  rateLimitsTriggered: number;
  passwordRecoveriesRequested: number;
  emailFailures: number;
  aiCalls: number;
  aiFailures: number;
  pdfsGenerated: number;
  pdfFailures: number;
}

const counters: MetricCounters = {
  requests: 0,
  responses2xx: 0,
  responses4xx: 0,
  responses5xx: 0,
  totalDurationMs: 0,
  loginRefused: 0,
  rateLimitsTriggered: 0,
  passwordRecoveriesRequested: 0,
  emailFailures: 0,
  aiCalls: 0,
  aiFailures: 0,
  pdfsGenerated: 0,
  pdfFailures: 0,
};

export const metrics = {
  observeRequest(statusCode: number, durationMs: number): void {
    counters.requests += 1;
    counters.totalDurationMs += durationMs;
    if (statusCode >= 200 && statusCode < 300) counters.responses2xx += 1;
    if (statusCode >= 400 && statusCode < 500) counters.responses4xx += 1;
    if (statusCode >= 500) counters.responses5xx += 1;
  },

  recordAudit(event: string): void {
    if (event === 'login_refused') counters.loginRefused += 1;
    if (event.endsWith('rate_limit_blocked')) counters.rateLimitsTriggered += 1;
    if (event === 'password_reset_requested') counters.passwordRecoveriesRequested += 1;
    if (event === 'password_reset_email_failed') counters.emailFailures += 1;
    if (event === 'ai_request_started') counters.aiCalls += 1;
    if (event === 'ai_error') counters.aiFailures += 1;
    if (event === 'report_pdf_generated') counters.pdfsGenerated += 1;
    if (event === 'report_pdf_failed') counters.pdfFailures += 1;
  },

  snapshot() {
    return {
      ...counters,
      averageResponseTimeMs: counters.requests === 0
        ? 0
        : Number((counters.totalDurationMs / counters.requests).toFixed(2)),
    };
  },
};
