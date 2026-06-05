ALTER TABLE document_versions
    ADD COLUMN IF NOT EXISTS content_bytes BYTEA;
