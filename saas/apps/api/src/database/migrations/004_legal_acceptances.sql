CREATE TABLE IF NOT EXISTS legal_acceptances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('TERMS_OF_USE', 'PRIVACY_POLICY')),
  document_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL,
  ip_hash TEXT,
  request_id TEXT,
  origin TEXT NOT NULL,
  metadata JSONB,
  UNIQUE(user_id, document_type, document_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_document
  ON legal_acceptances(user_id, document_type, document_version);
