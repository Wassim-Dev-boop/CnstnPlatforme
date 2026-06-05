-- ============================================================================
-- V22: SEED REALISTIC DEMO DATA FOR CNSTN INTRANET PFE REPORT
-- ============================================================================
-- Date: 2026-06-01
-- Purpose: Populate platform with realistic but fictional CNSTN data
-- for comprehensive UI screenshots in final year project report
-- ============================================================================

-- ============================================================================
-- 1. CREATE ADDITIONAL DEPARTMENTS (if not already present)
-- ============================================================================

INSERT INTO departments (id, code, name, description, active, created_at, updated_at)
VALUES 
    ('f0000001-0000-0000-0000-000000000001', 'SRH', 'Service Ressources Humaines', 'Service gestion des ressources humaines', TRUE, NOW(), NOW()),
    ('f0000002-0000-0000-0000-000000000002', 'SLG', 'Service Logistique', 'Service logistique et facilities', TRUE, NOW(), NOW()),
    ('f0000003-0000-0000-0000-000000000003', 'SFM', 'Service Formation', 'Service formation et développement', TRUE, NOW(), NOW()),
    ('f0000004-0000-0000-0000-000000000004', 'SDD', 'Service Documentation', 'Service documentation et archivage', TRUE, NOW(), NOW()),
    ('f0000005-0000-0000-0000-000000000005', 'SRD', 'Service Recherche et Développement', 'Service recherche et développement', TRUE, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- 2. CREATE ADDITIONAL REALISTIC USERS WITH TUNISIAN NAMES
-- ============================================================================

INSERT INTO users (id, username, email, first_name, last_name, phone, enabled, department_id, created_at, updated_at)
VALUES 
    ('a0000001-0000-0000-0000-000000000001', 'admin.cnstn', 'admin@cnstn.tn', 'Admin', 'CNSTN', '+21620000010', TRUE, 'f0000001-0000-0000-0000-000000000001', NOW(), NOW()),
    ('a0000002-0000-0000-0000-000000000002', 'mohamed.benali', 'mohamed.benali@cnstn.tn', 'Mohamed', 'Ben Ali', '+21695001234', TRUE, 'f0000001-0000-0000-0000-000000000001', NOW(), NOW()),
    ('a0000003-0000-0000-0000-000000000003', 'sami.trabelsi', 'sami.trabelsi@cnstn.tn', 'Sami', 'Trabelsi', '+21695001235', TRUE, 'f0000001-0000-0000-0000-000000000001', NOW(), NOW()),
    ('a0000004-0000-0000-0000-000000000004', 'amina.mansouri', 'amina.mansouri@cnstn.tn', 'Amina', 'Mansouri', '+21695001236', TRUE, 'f0000002-0000-0000-0000-000000000002', NOW(), NOW()),
    ('a0000005-0000-0000-0000-000000000005', 'karim.haddad', 'karim.haddad@cnstn.tn', 'Karim', 'Haddad', '+21695001237', TRUE, 'f0000003-0000-0000-0000-000000000003', NOW(), NOW()),
    ('a0000006-0000-0000-0000-000000000006', 'leila.kacem', 'leila.kacem@cnstn.tn', 'Leila', 'Kacem', '+21695001238', TRUE, 'f0000004-0000-0000-0000-000000000004', NOW(), NOW()),
    ('a0000007-0000-0000-0000-000000000007', 'youssef.gharbi', 'youssef.gharbi@cnstn.tn', 'Youssef', 'Gharbi', '+21695001239', TRUE, 'f0000001-0000-0000-0000-000000000001', NOW(), NOW()),
    ('a0000008-0000-0000-0000-000000000008', 'nabil.ferchichi', 'nabil.ferchichi@cnstn.tn', 'Nabil', 'Ferchichi', '+21695001240', TRUE, 'f0000001-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    updated_at = NOW();

-- ============================================================================
-- 3. ASSIGN ROLES TO NEW USERS
-- ============================================================================

-- Mohamed Ben Ali - EMPLOYE
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000002-0000-0000-0000-000000000002', id FROM roles WHERE name = 'EMPLOYE'
ON CONFLICT DO NOTHING;

-- Sami Trabelsi - CHEF_HIERARCHIQUE
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000003-0000-0000-0000-000000000003', id FROM roles WHERE name = 'CHEF_HIERARCHIQUE'
ON CONFLICT DO NOTHING;

-- Amina Mansouri - RESPONSABLE_SALLE
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000004-0000-0000-0000-000000000004', id FROM roles WHERE name = 'RESPONSABLE_SALLE'
ON CONFLICT DO NOTHING;

-- Karim Haddad - RESPONSABLE_SECURITE
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000005-0000-0000-0000-000000000005', id FROM roles WHERE name = 'RESPONSABLE_SECURITE'
ON CONFLICT DO NOTHING;

-- Leila Kacem - RESPONSABLE_QUALITE
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000006-0000-0000-0000-000000000006', id FROM roles WHERE name = 'RESPONSABLE_QUALITE'
ON CONFLICT DO NOTHING;

-- Youssef Gharbi - RESPONSABLE_IT
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000007-0000-0000-0000-000000000007', id FROM roles WHERE name = 'RESPONSABLE_IT'
ON CONFLICT DO NOTHING;

-- Nabil Ferchichi - DIRECTEUR_DSN
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000008-0000-0000-0000-000000000008', id FROM roles WHERE name = 'DIRECTEUR_DSN'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3b. ATTACH admin.cnstn TO A DEPARTMENT
-- ============================================================================
-- admin.cnstn is created by V3 with a random UUID. The INSERT above uses
-- ON CONFLICT (username) DO UPDATE which keeps the existing primary key,
-- so admin.cnstn keeps its random id. We assign its department here so
-- the admin profile is consistent with the rest of the demo data.
UPDATE users
SET department_id = 'f0000001-0000-0000-0000-000000000001',
    updated_at = NOW()
WHERE username = 'admin.cnstn'
  AND department_id IS NULL;

-- ============================================================================
-- 4. WORKFLOW DEFINITIONS / STEPS (handled by V6)
-- ============================================================================
-- Workflow definitions (workflow_definitions, workflow_steps) and the
-- step-action matrix are already seeded by V6 with the proper schema
-- (workflow_type / step_code). This migration intentionally does NOT
-- re-insert them to avoid column mismatches and unique constraint conflicts.
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- User accounts are now configured. Workflows and their steps were seeded by
-- V6. Additional data (events, reservations, GED docs, etc.) is created in
-- subsequent migrations or via API calls as needed per module structure.
