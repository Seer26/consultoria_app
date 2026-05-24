import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

import { aiQuestionRouter } from './modules/ai-question/ai-question.router';
import { aiDiagnosisRouter } from './modules/ai-diagnosis/ai-diagnosis.router';
import { actionPlanRouter } from './modules/action-plan/action-plan.router';
import { authRouter } from './modules/auth/auth.router';
import { companiesRouter } from './modules/companies/companies.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { diagnosisRouter } from './modules/diagnosis/diagnosis.router';
import { researchRouter } from './modules/research/research.router';

export const app = express();

const corsOptions: cors.CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/', companiesRouter);
app.use('/', researchRouter);
app.use('/', actionPlanRouter);
app.use('/ai', aiQuestionRouter);
app.use('/ai-diagnosis', aiDiagnosisRouter);
app.use('/', dashboardRouter);
app.use('/api/diagnosis', diagnosisRouter);

app.use((request: Request, response: Response) => {
  response.status(404).json({
    error: 'NOT_FOUND',
    message: `Rota ${request.method} ${request.originalUrl} nao encontrada.`,
  });
});

app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
  console.error('Unhandled API error', {
    method: request.method,
    url: request.originalUrl,
    error,
  });

  response.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno ao processar a requisicao.',
  });
});
