import { Router } from 'express';

import { hashIp } from '../../shared/request-context';
import { authenticate } from '../auth/auth.middleware';
import { legalService } from './legal.service';

export const legalRouter = Router();

legalRouter.use('/legal', authenticate);

legalRouter.get('/legal/documents/pending', async (request, response) => {
  response.status(200).json({
    pending: await legalService.listPending(request.auth!),
  });
});

legalRouter.get('/legal/acceptances/current', async (request, response) => {
  response.status(200).json({
    acceptances: await legalService.listCurrent(request.auth!),
  });
});

legalRouter.post('/legal/acceptances', async (request, response) => {
  try {
    const acceptances = await legalService.accept(request.auth!, {
      documentType: request.body?.documentType,
      documentVersion: request.body?.documentVersion,
      origin: request.body?.origin,
      ipHash: hashIp(request.ip),
      requestId: request.requestId,
    });
    response.status(201).json({ acceptances });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    response.status(code === 'INVALID_LEGAL_DOCUMENT_VERSION' ? 400 : 500).json({ error: code });
  }
});
