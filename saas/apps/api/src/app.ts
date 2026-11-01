import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

import { env } from './config/env';
import { getHealth, getReadiness } from './health/health.service';
import { aiQuestionRouter } from './modules/ai-question/ai-question.router';
import { actionPlanRouter } from './modules/action-plan/action-plan.router';
import { authRouter } from './modules/auth/auth.router';
import { behavioralRouter } from './modules/behavioral/behavioral.router';
import { companiesRouter } from './modules/companies/companies.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { diagnosisRouter } from './modules/diagnosis/diagnosis.router';
import { entitlementsRouter } from './modules/entitlements/entitlements.router';
import { reportsRouter } from './modules/reports/reports.router';
import { researchRouter } from './modules/research/research.router';
import { operationsRouter } from './modules/operations/operations.router';
import { legalRouter } from './modules/legal/legal.router';
import { strategyRouter } from './modules/strategy/strategy.router';
import { logger } from './shared/logger';
import { requestContext } from './shared/request-context';
import { securityHeaders } from './shared/security-headers';

export const app = express();

app.disable('x-powered-by');
if (env.trustProxyHops > 0) {
  app.set('trust proxy', env.trustProxyHops);
}

const corsOptions: cors.CorsOptions = {
  origin: env.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'Retry-After'],
};

app.use(requestContext);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.get('/health', async (_request, response) => {
  const health = await getHealth();
  response.status(health.status === 'error' ? 503 : 200).json(health);
});

app.get('/ready', async (_request, response) => {
  const readiness = await getReadiness();
  response.status(readiness.status === 'not_ready' ? 503 : 200).json(readiness);
});

app.post('/ai-diagnosis', (_request, response) => {
  response.status(410).json({ error: 'LEGACY_AI_DIAGNOSIS_DISABLED' });
});

app.use('/auth', authRouter);
app.use('/behavioral', behavioralRouter);
app.use('/', companiesRouter);
app.use('/', researchRouter);
app.use('/', actionPlanRouter);
app.use('/', reportsRouter);
app.use('/billing', entitlementsRouter);
app.use('/ai', aiQuestionRouter);
app.use('/', dashboardRouter);
app.use('/api/diagnosis', diagnosisRouter);
app.use('/', operationsRouter);
app.use('/', legalRouter);
app.use('/', strategyRouter);

app.use((request: Request, response: Response) => {
  response.status(404).json({
    error: 'NOT_FOUND',
    message: `Rota ${request.method} ${request.originalUrl} nao encontrada.`,
  });
});

app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
  logger.error('Unhandled API error', {
    requestId: request.requestId,
    method: request.method,
    url: request.originalUrl,
    error,
  });

  response.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno ao processar a requisicao.',
  });
});
