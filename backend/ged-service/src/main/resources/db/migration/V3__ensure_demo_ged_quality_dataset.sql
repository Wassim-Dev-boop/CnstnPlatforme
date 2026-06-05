-- V3: garantir un jeu de donnees GED exploitable pour la soutenance locale
-- (dossier principal + sous-dossier + documents + ACL coherent)

INSERT INTO ged_folders (id, name, parent_id, category, archived, created_by, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000100', 'GED', NULL, 'Racine', FALSE, 'systeme', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000101', 'Procedures et formulaires organisationnels', '00000000-0000-0000-0000-000000000100', 'ORGANISATION', FALSE, 'systeme', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000102', 'Procedures Techniques', '00000000-0000-0000-0000-000000000100', 'TECHNIQUE', FALSE, 'systeme', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    category = EXCLUDED.category,
    archived = FALSE,
    updated_at = NOW();

UPDATE ged_folders
SET archived = FALSE,
    updated_at = NOW()
WHERE id IN (
    '00000000-0000-0000-0000-000000000100'::UUID,
    '00000000-0000-0000-0000-000000000101'::UUID,
    '00000000-0000-0000-0000-000000000102'::UUID
);

-- Si aucun document n'est rattaché aux dossiers de demo, rattacher un document existant.
WITH demo_folders AS (
    SELECT UNNEST(ARRAY[
        '00000000-0000-0000-0000-000000000100'::UUID,
        '00000000-0000-0000-0000-000000000101'::UUID,
        '00000000-0000-0000-0000-000000000102'::UUID
    ]) AS id
),
candidate AS (
    SELECT d.id
    FROM documents d
    WHERE d.archived = FALSE
    ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC NULLS LAST, d.id
    LIMIT 1
)
UPDATE documents d
SET folder_id = '00000000-0000-0000-0000-000000000101'::UUID,
    updated_at = NOW()
WHERE d.id = (SELECT id FROM candidate)
  AND NOT EXISTS (
      SELECT 1
      FROM documents existing
      WHERE existing.archived = FALSE
        AND existing.folder_id IN (SELECT id FROM demo_folders)
  );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM documents WHERE reference_code = 'DOC-2026-9101'
    ) THEN
        INSERT INTO documents (
            id, title, category, sub_category, content, description, folder_id, reference_code,
            owner_service, confidentiality_level, status, archived, current_version_number,
            created_by, approved_by, published_at, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000201'::UUID,
            'Procedure de demonstration GED',
            'Procedures et formulaires organisationnels',
            'Soutenance',
            'Document de demonstration pour verification UI GED.',
            'Document de demonstration pour verification UI GED.',
            '00000000-0000-0000-0000-000000000101'::UUID,
            'DOC-2026-9101',
            'QUALITE',
            'INTERNAL',
            'PUBLISHED',
            FALSE,
            1,
            'qualite.cnstn',
            'qualite.cnstn',
            NOW(),
            NOW(),
            NOW()
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM documents WHERE reference_code = 'DOC-2026-9102'
    ) THEN
        INSERT INTO documents (
            id, title, category, sub_category, content, description, folder_id, reference_code,
            owner_service, confidentiality_level, status, archived, current_version_number,
            created_by, approved_by, published_at, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000202'::UUID,
            'Procedure restreinte demonstration GED',
            'Procedures Techniques',
            'Securite documentaire',
            'Document restreint pour controle ACL demo.',
            'Document restreint pour controle ACL demo.',
            '00000000-0000-0000-0000-000000000102'::UUID,
            'DOC-2026-9102',
            'QUALITE',
            'RESTRICTED',
            'PUBLISHED',
            FALSE,
            1,
            'qualite.cnstn',
            'qualite.cnstn',
            NOW(),
            NOW(),
            NOW()
        );
    END IF;
END $$;

INSERT INTO document_versions (
    id,
    document_id,
    version_number,
    file_name,
    mime_type,
    file_size,
    content_text,
    content_bytes,
    change_note,
    created_by,
    created_at,
    is_current
)
SELECT
    '00000000-0000-0000-0000-000000000211'::UUID,
    '00000000-0000-0000-0000-000000000201'::UUID,
    1,
    'procedure-demo-ged.txt',
    'text/plain',
    LENGTH('Document de demonstration pour verification UI GED.'),
    'Document de demonstration pour verification UI GED.',
    convert_to('Document de demonstration pour verification UI GED.', 'UTF8'),
    'Version initiale demo',
    'qualite.cnstn',
    NOW(),
    TRUE
WHERE EXISTS (
    SELECT 1 FROM documents WHERE id = '00000000-0000-0000-0000-000000000201'::UUID
)
  AND NOT EXISTS (
    SELECT 1 FROM document_versions
    WHERE document_id = '00000000-0000-0000-0000-000000000201'::UUID
      AND version_number = 1
);

INSERT INTO document_versions (
    id,
    document_id,
    version_number,
    file_name,
    mime_type,
    file_size,
    content_text,
    content_bytes,
    change_note,
    created_by,
    created_at,
    is_current
)
SELECT
    '00000000-0000-0000-0000-000000000212'::UUID,
    '00000000-0000-0000-0000-000000000202'::UUID,
    1,
    'procedure-restreinte-demo-ged.txt',
    'text/plain',
    LENGTH('Document restreint pour controle ACL demo.'),
    'Document restreint pour controle ACL demo.',
    convert_to('Document restreint pour controle ACL demo.', 'UTF8'),
    'Version initiale demo',
    'qualite.cnstn',
    NOW(),
    TRUE
WHERE EXISTS (
    SELECT 1 FROM documents WHERE id = '00000000-0000-0000-0000-000000000202'::UUID
)
  AND NOT EXISTS (
    SELECT 1 FROM document_versions
    WHERE document_id = '00000000-0000-0000-0000-000000000202'::UUID
      AND version_number = 1
);

UPDATE document_versions
SET is_current = FALSE
WHERE document_id IN (
    '00000000-0000-0000-0000-000000000201'::UUID,
    '00000000-0000-0000-0000-000000000202'::UUID
)
  AND id NOT IN (
      '00000000-0000-0000-0000-000000000211'::UUID,
      '00000000-0000-0000-0000-000000000212'::UUID
  );

INSERT INTO document_acl_entries (id, document_id, acl_type, acl_value, created_by, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000301'::UUID, '00000000-0000-0000-0000-000000000201'::UUID, 'ROLE', 'ADMIN', 'systeme', NOW()),
    ('00000000-0000-0000-0000-000000000302'::UUID, '00000000-0000-0000-0000-000000000201'::UUID, 'ROLE', 'RESPONSABLE_QUALITE', 'systeme', NOW()),
    ('00000000-0000-0000-0000-000000000303'::UUID, '00000000-0000-0000-0000-000000000201'::UUID, 'ROLE', 'EMPLOYE', 'systeme', NOW()),
    ('00000000-0000-0000-0000-000000000304'::UUID, '00000000-0000-0000-0000-000000000202'::UUID, 'ROLE', 'ADMIN', 'systeme', NOW()),
    ('00000000-0000-0000-0000-000000000305'::UUID, '00000000-0000-0000-0000-000000000202'::UUID, 'ROLE', 'RESPONSABLE_QUALITE', 'systeme', NOW())
ON CONFLICT (document_id, acl_type, acl_value) DO NOTHING;
