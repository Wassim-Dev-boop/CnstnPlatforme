-- ============================================================================
-- V5: SEED ADDITIONAL DEMO DOCUMENTS FOR CNSTN INTRANET (PFE REPORT)
-- ============================================================================
-- Date      : 2026-06-04
-- Purpose   : Add 2 extra demo documents on top of the 2 already created
--              by V3 (which is reserved for the core quality dataset).
--              V5 focuses on the RH service and the IT service to round
--              out the UI document tree for the PFE report.
-- Idempotent: every INSERT uses ON CONFLICT / WHERE NOT EXISTS guards.
-- Notes     :
--   * documents.content is TEXT (per V1 schema), not BYTEA.
--   * Folder ids are the ones seeded by V3.
-- ============================================================================

-- ============================================================================
-- 1. DOCUMENT #3 - Procedure RH (in ORGANISATION folder)
-- ============================================================================
INSERT INTO documents (
    id, title, category, sub_category, content, description,
    folder_id, reference_code, owner_service,
    confidentiality_level, status, archived, current_version_number,
    created_by, approved_by, published_at, created_at, updated_at
)
SELECT
    '00000000-0000-0000-0000-000000000203'::UUID,
    'Procedure de gestion des conges annuels',
    'Procedures et formulaires organisationnels',
    'Ressources Humaines',
    'Procedure detaillee de saisie, validation et suivi des conges annuels pour les collaborateurs CNSTN.',
    'Procedure RH - conges annuels (demo PFE).',
    '00000000-0000-0000-0000-000000000101'::UUID,
    'DOC-2026-9103',
    'RH',
    'INTERNAL',
    'PUBLISHED',
    FALSE,
    1,
    'mohamed.benali',
    'mohamed.benali',
    NOW(),
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM documents WHERE reference_code = 'DOC-2026-9103'
);

INSERT INTO document_versions (
    id, document_id, version_number, file_name, mime_type, file_size,
    content_text, content_bytes, change_note, created_by, created_at, is_current
)
SELECT
    '00000000-0000-0000-0000-000000000213'::UUID,
    '00000000-0000-0000-0000-000000000203'::UUID,
    1,
    'procedure-conges-annuels.txt',
    'text/plain',
    LENGTH('Procedure detaillee de saisie, validation et suivi des conges annuels pour les collaborateurs CNSTN.'),
    'Procedure detaillee de saisie, validation et suivi des conges annuels pour les collaborateurs CNSTN.',
    convert_to('Procedure detaillee de saisie, validation et suivi des conges annuels pour les collaborateurs CNSTN.', 'UTF8'),
    'Version initiale demo',
    'mohamed.benali',
    NOW(),
    TRUE
WHERE EXISTS (SELECT 1 FROM documents WHERE id = '00000000-0000-0000-0000-000000000203'::UUID)
  AND NOT EXISTS (
    SELECT 1 FROM document_versions
    WHERE document_id = '00000000-0000-0000-0000-000000000203'::UUID AND version_number = 1
  );

INSERT INTO document_acl_entries (id, document_id, acl_type, acl_value, created_by, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000306'::UUID, '00000000-0000-0000-0000-000000000203'::UUID, 'ROLE', 'ADMIN', 'systeme', NOW()),
    ('00000000-0000-0000-0000-000000000307'::UUID, '00000000-0000-0000-0000-000000000203'::UUID, 'ROLE', 'RESPONSABLE_QUALITE', 'systeme', NOW()),
    ('00000000-0000-0000-0000-000000000308'::UUID, '00000000-0000-0000-0000-000000000203'::UUID, 'ROLE', 'EMPLOYE', 'systeme', NOW())
ON CONFLICT (document_id, acl_type, acl_value) DO NOTHING;

-- ============================================================================
-- 2. DOCUMENT #4 - Procedure IT (in TECHNIQUE folder, DRAFT status)
-- ============================================================================
INSERT INTO documents (
    id, title, category, sub_category, content, description,
    folder_id, reference_code, owner_service,
    confidentiality_level, status, archived, current_version_number,
    created_by, approved_by, published_at, created_at, updated_at
)
SELECT
    '00000000-0000-0000-0000-000000000204'::UUID,
    'Charte d''utilisation du parc informatique',
    'Procedures Techniques',
    'Securite informatique',
    'Regles d''usage du materiel informatique, mots de passe, VPN et equipements nomades.',
    'Charte IT - brouillon (demo PFE).',
    '00000000-0000-0000-0000-000000000102'::UUID,
    'DOC-2026-9104',
    'IT',
    'INTERNAL',
    'DRAFT',
    FALSE,
    1,
    'youssef.gharbi',
    NULL,
    NULL,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM documents WHERE reference_code = 'DOC-2026-9104'
);

INSERT INTO document_versions (
    id, document_id, version_number, file_name, mime_type, file_size,
    content_text, content_bytes, change_note, created_by, created_at, is_current
)
SELECT
    '00000000-0000-0000-0000-000000000214'::UUID,
    '00000000-0000-0000-0000-000000000204'::UUID,
    1,
    'charte-it-brouillon.txt',
    'text/plain',
    LENGTH('Regles d''usage du materiel informatique, mots de passe, VPN et equipements nomades.'),
    'Regles d''usage du materiel informatique, mots de passe, VPN et equipements nomades.',
    convert_to('Regles d''usage du materiel informatique, mots de passe, VPN et equipements nomades.', 'UTF8'),
    'Version initiale brouillon',
    'youssef.gharbi',
    NOW(),
    TRUE
WHERE EXISTS (SELECT 1 FROM documents WHERE id = '00000000-0000-0000-0000-000000000204'::UUID)
  AND NOT EXISTS (
    SELECT 1 FROM document_versions
    WHERE document_id = '00000000-0000-0000-0000-000000000204'::UUID AND version_number = 1
  );

INSERT INTO document_acl_entries (id, document_id, acl_type, acl_value, created_by, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000309'::UUID, '00000000-0000-0000-0000-000000000204'::UUID, 'ROLE', 'ADMIN', 'systeme', NOW()),
    ('00000000-0000-0000-0000-000000000310'::UUID, '00000000-0000-0000-0000-000000000204'::UUID, 'ROLE', 'RESPONSABLE_IT', 'systeme', NOW())
ON CONFLICT (document_id, acl_type, acl_value) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 2 additional documents inserted: 1 PUBLISHED (RH) + 1 DRAFT (IT).
-- Total GED demo after V3+V5: 4 documents, 4 versions, 10 ACL entries.
