-- ============================================================================
-- V6: ENSURE LAB0 SUB-FOLDER AND PUBLISHED DOCUMENT FOR DEMO
-- ============================================================================
-- Purpose : The "Lab0" sub-folder was created dynamically during testing.
--           This migration ensures it exists in the canonical schema and
--           guarantees that at least one PUBLISHED document is in there so
--           EMPLOYE-role users can see content (they only see PUBLISHED).
--           Also publishes a demo document in "Procedures Techniques" so
--           the sidebar count is non-zero for non-admin users.
-- ============================================================================

-- 1. Ensure Lab0 sub-folder under "Procedures et formulaires organisationnels"
INSERT INTO ged_folders (id, name, parent_id, category, archived, created_by, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000103',
    'Lab0',
    '00000000-0000-0000-0000-000000000101',
    'ORGANISATION',
    FALSE,
    'systeme',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    category = EXCLUDED.category,
    archived = FALSE,
    updated_at = NOW();

-- 2. Ensure a PUBLISHED demo document in Lab0
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM documents WHERE reference_code = 'DOC-2026-LAB0-1'
    ) THEN
        INSERT INTO documents (
            id, title, category, sub_category, content, description,
            folder_id, reference_code, owner_service,
            confidentiality_level, status, archived, current_version_number,
            created_by, approved_by, published_at, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000220'::UUID,
            'Note de service - Lab0 demo',
            'Procedures et formulaires organisationnels',
            'Demonstration',
            'Note de service publiee pour le dossier Lab0 - visible par tous les employes.',
            'Document de demonstration pour le sous-dossier Lab0.',
            '00000000-0000-0000-0000-000000000103'::UUID,
            'DOC-2026-LAB0-1',
            'DSN',
            'INTERNAL',
            'PUBLISHED',
            FALSE,
            1,
            'admin.cnstn',
            'admin.cnstn',
            NOW(),
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- 3. Version for the new Lab0 doc
INSERT INTO document_versions (
    id, document_id, version_number, file_name, mime_type, file_size,
    content_text, content_bytes, change_note, created_by, created_at, is_current
)
SELECT
    '00000000-0000-0000-0000-000000000230'::UUID,
    '00000000-0000-0000-0000-000000000220'::UUID,
    1,
    'note-service-lab0-demo.txt',
    'text/plain',
    LENGTH('Note de service publiee pour le dossier Lab0 - visible par tous les employes.'),
    'Note de service publiee pour le dossier Lab0 - visible par tous les employes.',
    convert_to('Note de service publiee pour le dossier Lab0 - visible par tous les employes.', 'UTF8'),
    'Version initiale',
    'admin.cnstn',
    NOW(),
    TRUE
WHERE EXISTS (SELECT 1 FROM documents WHERE id = '00000000-0000-0000-0000-000000000220'::UUID)
  AND NOT EXISTS (
    SELECT 1 FROM document_versions
    WHERE document_id = '00000000-0000-0000-0000-000000000220'::UUID
      AND version_number = 1
  );

-- 4. Publish the FICH0 doc that already lives in Lab0 (so EMPLOYE can see it)
UPDATE documents
SET status = 'PUBLISHED',
    published_at = COALESCE(published_at, NOW()),
    updated_at = NOW()
WHERE id = 'efbb4eed-0868-4f0f-840a-90500934db44'
  AND status <> 'PUBLISHED';

-- 5. Publish the second Procedures Techniques doc so non-admins see > 0 docs there
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM documents WHERE id = '00000000-0000-0000-0000-000000000202'::UUID
          AND status = 'PUBLISHED'
    ) THEN
        -- Make sure confidentiality is INTERNAL so it's visible to EMPLOYE
        UPDATE documents
        SET confidentiality_level = 'INTERNAL',
            updated_at = NOW()
        WHERE id = '00000000-0000-0000-0000-000000000202'::UUID
          AND confidentiality_level = 'RESTRICTED';
    END IF;
END $$;
