CREATE TABLE IF NOT EXISTS ged_folders (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    parent_id UUID,
    category VARCHAR(120),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ged_folders_parent'
    ) THEN
        ALTER TABLE ged_folders
            ADD CONSTRAINT fk_ged_folders_parent
                FOREIGN KEY (parent_id) REFERENCES ged_folders(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    category VARCHAR(120) NOT NULL,
    sub_category VARCHAR(80),
    content TEXT,
    description VARCHAR(2000),
    folder_id UUID,
    reference_code VARCHAR(24),
    owner_service VARCHAR(120),
    confidentiality_level VARCHAR(20) NOT NULL DEFAULT 'INTERNAL',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    current_version_number INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(120) NOT NULL,
    approved_by VARCHAR(120),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS description VARCHAR(2000);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reference_code VARCHAR(24);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_service VARCHAR(120);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidentiality_level VARCHAR(20);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS archived BOOLEAN;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS current_version_number INTEGER;

UPDATE documents
SET status = 'DRAFT'
WHERE status IS NULL OR TRIM(status) = '';

UPDATE documents
SET archived = FALSE
WHERE archived IS NULL;

UPDATE documents
SET current_version_number = 1
WHERE current_version_number IS NULL OR current_version_number < 1;

UPDATE documents
SET confidentiality_level = 'INTERNAL'
WHERE confidentiality_level IS NULL OR TRIM(confidentiality_level) = '';

UPDATE documents
SET description = LEFT(COALESCE(content, title, ''), 2000)
WHERE description IS NULL;

ALTER TABLE documents
    ALTER COLUMN archived SET NOT NULL;

ALTER TABLE documents
    ALTER COLUMN current_version_number SET NOT NULL;

ALTER TABLE documents
    ALTER COLUMN confidentiality_level SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_folder'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT fk_documents_folder
                FOREIGN KEY (folder_id) REFERENCES ged_folders(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_confidentiality'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT chk_documents_confidentiality
                CHECK (confidentiality_level IN ('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_status'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT chk_documents_status
                CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS ged_reference_counters (
    id UUID PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL,
    year_value INTEGER NOT NULL,
    last_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_ged_reference_counter_prefix_year'
    ) THEN
        ALTER TABLE ged_reference_counters
            ADD CONSTRAINT uk_ged_reference_counter_prefix_year UNIQUE (prefix, year_value);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    file_name VARCHAR(220) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size BIGINT NOT NULL,
    content_text TEXT NOT NULL,
    change_note VARCHAR(500),
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_versions_document'
    ) THEN
        ALTER TABLE document_versions
            ADD CONSTRAINT fk_document_versions_document
                FOREIGN KEY (document_id) REFERENCES documents(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_document_version_number'
    ) THEN
        ALTER TABLE document_versions
            ADD CONSTRAINT uk_document_version_number UNIQUE (document_id, version_number);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS document_links (
    id UUID PRIMARY KEY,
    source_document_id UUID NOT NULL,
    linked_document_id UUID NOT NULL,
    relation_type VARCHAR(30) NOT NULL,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_links_source'
    ) THEN
        ALTER TABLE document_links
            ADD CONSTRAINT fk_document_links_source
                FOREIGN KEY (source_document_id) REFERENCES documents(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_links_target'
    ) THEN
        ALTER TABLE document_links
            ADD CONSTRAINT fk_document_links_target
                FOREIGN KEY (linked_document_id) REFERENCES documents(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_document_links_unique'
    ) THEN
        ALTER TABLE document_links
            ADD CONSTRAINT uk_document_links_unique
                UNIQUE (source_document_id, linked_document_id, relation_type);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS document_acl_entries (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    acl_type VARCHAR(20) NOT NULL,
    acl_value VARCHAR(120) NOT NULL,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_acl_document'
    ) THEN
        ALTER TABLE document_acl_entries
            ADD CONSTRAINT fk_document_acl_document
                FOREIGN KEY (document_id) REFERENCES documents(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_document_acl_unique'
    ) THEN
        ALTER TABLE document_acl_entries
            ADD CONSTRAINT uk_document_acl_unique
                UNIQUE (document_id, acl_type, acl_value);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_acl_type'
    ) THEN
        ALTER TABLE document_acl_entries
            ADD CONSTRAINT chk_document_acl_type
                CHECK (acl_type IN ('ROLE', 'SERVICE'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS ged_audit_logs (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(40) NOT NULL,
    entity_id UUID,
    action VARCHAR(60) NOT NULL,
    actor_username VARCHAR(120) NOT NULL,
    actor_roles VARCHAR(300),
    actor_service VARCHAR(120),
    details_json TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

INSERT INTO ged_folders (id, name, parent_id, category, archived, created_by, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000100', 'GED', NULL, 'Racine', FALSE, 'systeme', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000101', 'Procedures et formulaires organisationnels', '00000000-0000-0000-0000-000000000100', 'ORGANISATION', FALSE, 'systeme', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000102', 'Procedures Techniques', '00000000-0000-0000-0000-000000000100', 'TECHNIQUE', FALSE, 'systeme', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE documents
SET folder_id = CASE
    WHEN category ILIKE 'Procedures et formulaires organisationnels' THEN '00000000-0000-0000-0000-000000000101'::UUID
    WHEN category ILIKE 'Procedures Techniques' THEN '00000000-0000-0000-0000-000000000102'::UUID
    ELSE '00000000-0000-0000-0000-000000000100'::UUID
END
WHERE folder_id IS NULL;

WITH ranked AS (
    SELECT
        id,
        EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::INT AS ref_year,
        ROW_NUMBER() OVER (
            PARTITION BY EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::INT
            ORDER BY created_at NULLS LAST, id
        ) AS seq
    FROM documents
    WHERE reference_code IS NULL OR TRIM(reference_code) = ''
)
UPDATE documents d
SET reference_code = 'DOC-' || ranked.ref_year || '-' || LPAD(ranked.seq::TEXT, 4, '0')
FROM ranked
WHERE d.id = ranked.id;

INSERT INTO ged_reference_counters (id, prefix, year_value, last_value, created_at, updated_at)
SELECT
    (
        SUBSTRING(md5('DOC-' || parsed.ref_year::TEXT), 1, 8)
            || '-'
            || SUBSTRING(md5('DOC-' || parsed.ref_year::TEXT), 9, 4)
            || '-'
            || SUBSTRING(md5('DOC-' || parsed.ref_year::TEXT), 13, 4)
            || '-'
            || SUBSTRING(md5('DOC-' || parsed.ref_year::TEXT), 17, 4)
            || '-'
            || SUBSTRING(md5('DOC-' || parsed.ref_year::TEXT), 21, 12)
    )::UUID,
    'DOC',
    parsed.ref_year,
    MAX(parsed.ref_seq),
    NOW(),
    NOW()
FROM (
    SELECT
        (regexp_match(reference_code, '^DOC-(\d{4})-(\d{4})$'))[1]::INT AS ref_year,
        (regexp_match(reference_code, '^DOC-(\d{4})-(\d{4})$'))[2]::INT AS ref_seq
    FROM documents
    WHERE reference_code ~ '^DOC-\d{4}-\d{4}$'
) parsed
GROUP BY parsed.ref_year
ON CONFLICT (prefix, year_value)
DO UPDATE SET last_value = GREATEST(ged_reference_counters.last_value, EXCLUDED.last_value),
              updated_at = NOW();

INSERT INTO document_versions (
    id,
    document_id,
    version_number,
    file_name,
    mime_type,
    file_size,
    content_text,
    change_note,
    created_by,
    created_at,
    is_current
)
SELECT
    (
        SUBSTRING(md5(d.id::TEXT || '-v1'), 1, 8)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-v1'), 9, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-v1'), 13, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-v1'), 17, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-v1'), 21, 12)
    )::UUID,
    d.id,
    GREATEST(COALESCE(d.current_version_number, 1), 1),
    d.title || '.txt',
    'text/plain',
    LENGTH(COALESCE(d.content, d.title, '')),
    COALESCE(d.content, d.title, ''),
    'Migration version initiale',
    COALESCE(d.created_by, 'systeme'),
    COALESCE(d.created_at, NOW()),
    TRUE
FROM documents d
WHERE NOT EXISTS (
    SELECT 1
    FROM document_versions v
    WHERE v.document_id = d.id
);

UPDATE document_versions
SET is_current = FALSE;

WITH latest AS (
    SELECT
        document_id,
        MAX(version_number) AS max_version
    FROM document_versions
    GROUP BY document_id
)
UPDATE document_versions v
SET is_current = TRUE
FROM latest
WHERE v.document_id = latest.document_id
  AND v.version_number = latest.max_version;

WITH latest AS (
    SELECT
        document_id,
        MAX(version_number) AS max_version
    FROM document_versions
    GROUP BY document_id
)
UPDATE documents d
SET current_version_number = latest.max_version
FROM latest
WHERE d.id = latest.document_id;

INSERT INTO document_acl_entries (id, document_id, acl_type, acl_value, created_by, created_at)
SELECT
    (
        SUBSTRING(md5(d.id::TEXT || '-ROLE-RESPONSABLE_QUALITE'), 1, 8)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-ROLE-RESPONSABLE_QUALITE'), 9, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-ROLE-RESPONSABLE_QUALITE'), 13, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-ROLE-RESPONSABLE_QUALITE'), 17, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-ROLE-RESPONSABLE_QUALITE'), 21, 12)
    )::UUID,
    d.id,
    'ROLE',
    'RESPONSABLE_QUALITE',
    'systeme',
    NOW()
FROM documents d
ON CONFLICT (document_id, acl_type, acl_value) DO NOTHING;

INSERT INTO document_acl_entries (id, document_id, acl_type, acl_value, created_by, created_at)
SELECT
    (
        SUBSTRING(md5(d.id::TEXT || '-ROLE-ADMIN'), 1, 8)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-ROLE-ADMIN'), 9, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-ROLE-ADMIN'), 13, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-ROLE-ADMIN'), 17, 4)
            || '-'
            || SUBSTRING(md5(d.id::TEXT || '-ROLE-ADMIN'), 21, 12)
    )::UUID,
    d.id,
    'ROLE',
    'ADMIN',
    'systeme',
    NOW()
FROM documents d
ON CONFLICT (document_id, acl_type, acl_value) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS uk_documents_reference_code ON documents(reference_code);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_confidentiality ON documents(confidentiality_level);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_links_source ON document_links(source_document_id);
CREATE INDEX IF NOT EXISTS idx_document_acl_document ON document_acl_entries(document_id);
CREATE INDEX IF NOT EXISTS idx_ged_audit_logs_entity ON ged_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ged_audit_logs_created_at ON ged_audit_logs(created_at DESC);
