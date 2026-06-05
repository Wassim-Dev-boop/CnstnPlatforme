-- ============================================================================
-- V23: SEED REALISTIC IT EQUIPMENT FOR PFE REPORT
-- ============================================================================
-- Date: 2026-06-01
-- Purpose: Populate it_equipment tables in auth_user_db with demo data
-- ============================================================================

-- ============================================================================
-- 1. CREATE IT EQUIPMENT CATEGORIES (if not already present)
-- ============================================================================

INSERT INTO it_equipment_categories (id, name, description, active, created_at, updated_at)
VALUES
    ('ca000001-0000-0000-0000-000000000001', 'Ordinateurs', 'Ordinateurs de bureau et portables', TRUE, NOW(), NOW()),
    ('ca000002-0000-0000-0000-000000000002', 'Peripheriques', 'Imprimantes, scanners, etc.', TRUE, NOW(), NOW()),
    ('ca000003-0000-0000-0000-000000000003', 'Equipements Reseau', 'Commutateurs, routeurs, etc.', TRUE, NOW(), NOW()),
    ('ca000004-0000-0000-0000-000000000004', 'Equipements AV', 'Cameras, microphones, etc.', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. CREATE IT EQUIPMENT ITEMS
-- ============================================================================
-- Actual schema: id, name, serial_number, category_id, brand, model,
--                state, assignment_status, description, current_employee_id,
--                created_at, updated_at

-- Equipment 1: PC portable HP ProBook
INSERT INTO it_equipment (id, name, serial_number, category_id, brand, model, state,
                         assignment_status, current_employee_id, created_at, updated_at)
VALUES
    ('ea000001-0000-0000-0000-000000000001',
     'PC portable HP ProBook',
     'HP-CNSTN-2026-001',
     'ca000001-0000-0000-0000-000000000001',
     'HP', 'ProBook 440 G8',
     'OPERATIONAL', 'ASSIGNED',
     'a0000002-0000-0000-0000-000000000002',
     NOW(), NOW())
ON CONFLICT (serial_number) DO NOTHING;

-- Equipment 2: PC bureau Dell OptiPlex
INSERT INTO it_equipment (id, name, serial_number, category_id, brand, model, state,
                         assignment_status, current_employee_id, created_at, updated_at)
VALUES
    ('ea000002-0000-0000-0000-000000000002',
     'PC bureau Dell OptiPlex',
     'DELL-CNSTN-2026-002',
     'ca000001-0000-0000-0000-000000000001',
     'Dell', 'OptiPlex 7090',
     'OPERATIONAL', 'ASSIGNED',
     'a0000006-0000-0000-0000-000000000006',
     NOW(), NOW())
ON CONFLICT (serial_number) DO NOTHING;

-- Equipment 3: Imprimante HP LaserJet
INSERT INTO it_equipment (id, name, serial_number, category_id, brand, model, state,
                         assignment_status, created_at, updated_at)
VALUES
    ('ea000003-0000-0000-0000-000000000003',
     'Imprimante HP LaserJet',
     'PRN-CNSTN-2026-003',
     'ca000002-0000-0000-0000-000000000002',
     'HP', 'LaserJet Pro M404',
     'IN_MAINTENANCE', 'NOT_ASSIGNED',
     NOW(), NOW())
ON CONFLICT (serial_number) DO NOTHING;

-- Equipment 4: Camera Logitech MeetUp
INSERT INTO it_equipment (id, name, serial_number, category_id, brand, model, state,
                         assignment_status, created_at, updated_at)
VALUES
    ('ea000004-0000-0000-0000-000000000004',
     'Camera Logitech MeetUp',
     'CAM-CNSTN-2026-004',
     'ca000004-0000-0000-0000-000000000004',
     'Logitech', 'MeetUp',
     'OPERATIONAL', 'NOT_ASSIGNED',
     NOW(), NOW())
ON CONFLICT (serial_number) DO NOTHING;

-- Equipment 5: Switch reseau Cisco
INSERT INTO it_equipment (id, name, serial_number, category_id, brand, model, state,
                         assignment_status, created_at, updated_at)
VALUES
    ('ea000005-0000-0000-0000-000000000005',
     'Switch reseau Cisco',
     'NET-CNSTN-2026-005',
     'ca000003-0000-0000-0000-000000000003',
     'Cisco', 'Catalyst 2960',
     'IN_REPAIR', 'NOT_ASSIGNED',
     NOW(), NOW())
ON CONFLICT (serial_number) DO NOTHING;

-- ============================================================================
-- 3. CREATE IT EQUIPMENT ASSIGNMENTS
-- ============================================================================
-- Actual schema: id, equipment_id, employee_id, employee_name, assigned_at,
--                returned_at, assigned_by, status, created_at, updated_at

INSERT INTO it_equipment_assignments (id, equipment_id, employee_id, employee_name,
                                     assigned_at, returned_at, status, created_at, updated_at)
VALUES
    ('eb000001-0000-0000-0000-000000000001', 'ea000001-0000-0000-0000-000000000001',
     'a0000002-0000-0000-0000-000000000002', 'Mohamed Ben Ali',
     '2024-03-15', NULL, 'ACTIVE', NOW(), NOW()),
    ('eb000002-0000-0000-0000-000000000002', 'ea000002-0000-0000-0000-000000000002',
     'a0000006-0000-0000-0000-000000000006', 'Leila Kacem',
     '2023-09-20', NULL, 'ACTIVE', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- IT equipment items are now seeded for UI screenshots.
