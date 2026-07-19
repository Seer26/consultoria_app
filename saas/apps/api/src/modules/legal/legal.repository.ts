import { database } from '../../db/database';

export type LegalDocumentType = 'TERMS_OF_USE' | 'PRIVACY_POLICY';

interface LegalAcceptanceRow {
  id: string;
  user_id: string;
  company_id: string | null;
  document_type: LegalDocumentType;
  document_version: string;
  accepted_at: string;
  ip_hash: string | null;
  request_id: string | null;
  origin: string;
}

export class LegalRepository {
  listForUser(userId: string): LegalAcceptanceRow[] {
    return database.prepare(`
      SELECT id, user_id, company_id, document_type, document_version,
             accepted_at, ip_hash, request_id, origin
      FROM legal_acceptances
      WHERE user_id = ?
      ORDER BY accepted_at DESC
    `).all(userId) as LegalAcceptanceRow[];
  }

  create(input: {
    id: string;
    userId: string;
    companyId: string | null;
    documentType: LegalDocumentType;
    documentVersion: string;
    acceptedAt: string;
    ipHash: string | null;
    requestId: string | null;
    origin: string;
  }): void {
    database.prepare(`
      INSERT INTO legal_acceptances (
        id, user_id, company_id, document_type, document_version,
        accepted_at, ip_hash, request_id, origin, metadata
      ) VALUES (
        @id, @userId, @companyId, @documentType, @documentVersion,
        @acceptedAt, @ipHash, @requestId, @origin, NULL
      )
      ON CONFLICT(user_id, document_type, document_version) DO NOTHING
    `).run(input);
  }
}
