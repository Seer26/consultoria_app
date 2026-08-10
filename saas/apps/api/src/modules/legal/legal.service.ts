import { randomUUID } from 'node:crypto';

import { env } from '../../config/env';
import { audit } from '../../shared/audit';
import type { AuthTokenPayload } from '../auth/auth.types';
import { requiredLegalDocuments } from './legal.documents';
import { isLegalAcceptanceRequired } from './legal.policy';
import { LegalRepository } from './legal.repository';

const requiredDocuments = () => requiredLegalDocuments({
  termsVersion: env.termsVersion,
  privacyVersion: env.privacyVersion,
});

export class LegalService {
  constructor(private readonly repository = new LegalRepository()) {}

  async listCurrent(auth: AuthTokenPayload) {
    return (await this.repository.listForUser(auth.userId)).map((row) => ({
      documentType: row.document_type,
      documentVersion: row.document_version,
      acceptedAt: row.accepted_at,
      origin: row.origin,
    }));
  }

  async listPending(auth: AuthTokenPayload) {
    const accepted = new Set(
      (await this.repository.listForUser(auth.userId))
        .map((row) => `${row.document_type}:${row.document_version}`),
    );
    return requiredDocuments().filter(
      (document) => !accepted.has(`${document.documentType}:${document.version}`),
    );
  }

  async hasPending(auth: AuthTokenPayload): Promise<boolean> {
    return isLegalAcceptanceRequired() && (await this.listPending(auth)).length > 0;
  }

  async accept(auth: AuthTokenPayload, input: {
    documentType?: string;
    documentVersion?: string;
    origin?: string;
    ipHash?: string;
    requestId?: string;
  }) {
    const document = requiredDocuments().find(
      (candidate) => candidate.documentType === input.documentType,
    );
    if (!document || input.documentVersion !== document.version) {
      throw new Error('INVALID_LEGAL_DOCUMENT_VERSION');
    }
    const origin = input.origin === 'FLUTTER_WEB' || input.origin === 'FLUTTER_APP'
      ? input.origin
      : 'API';
    await this.repository.create({
      id: randomUUID(),
      userId: auth.userId,
      companyId: auth.companyId,
      documentType: document.documentType,
      documentVersion: document.version,
      acceptedAt: new Date().toISOString(),
      ipHash: input.ipHash ?? null,
      requestId: input.requestId ?? null,
      origin,
    });
    audit('legal_document_accepted', {
      requestId: input.requestId,
      userId: auth.userId,
      companyId: auth.companyId,
      documentType: document.documentType,
      documentVersion: document.version,
    });
    return this.listCurrent(auth);
  }
}

export const legalService = new LegalService();
