-- ============================================================================
-- V7: SEED DEMO ROOMS, EQUIPMENTS AND RESERVATIONS FOR CNSTN INTRANET
-- ============================================================================
-- Date      : 2026-06-04
-- Purpose   : Provide realistic demo data (4 rooms, 2 equipments, 3
--              reservations) for the PFE report UI screenshots.
-- Idempotent: every INSERT uses ON CONFLICT / WHERE NOT EXISTS guards.
-- Notes     :
--   * rooms.status uses the values allowed by chk_room_status_allowed
--     (DISPONIBLE / OCCUPEE / MAINTENANCE / INACTIVE) per V3.
--   * equipments requires total_quantity, available_quantity, status
--     (all NOT NULL per V3 + ddl-auto: validate).
--   * reservations.business_version is set to 1 and reference_code is
--     generated on insert (a backfill UPDATE is not needed since we run
--     BEFORE any DML would trigger the NOT NULL constraint).
--   * The XOR constraint chk_reservation_resource_xor requires exactly
--     one of (room_id, equipment_id) to be NOT NULL.
-- ============================================================================

-- ============================================================================
-- 1. ROOMS (4 demo rooms)
-- ============================================================================

INSERT INTO rooms (id, name, location, capacity, active, status, description, image_url, created_at, updated_at)
SELECT 'd0000001-0000-0000-0000-000000000001', 'Salle de conference A', 'Etage 1 - aile est', 80, TRUE, 'DISPONIBLE',
       'Grande salle de conference avec video-projecteur et sonorisation', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE id = 'd0000001-0000-0000-0000-000000000001');

INSERT INTO rooms (id, name, location, capacity, active, status, description, image_url, created_at, updated_at)
SELECT 'd0000002-0000-0000-0000-000000000002', 'Salle de reunion B201', 'Etage 2 - aile ouest', 15, TRUE, 'DISPONIBLE',
       'Salle de reunion moyenne avec ecran interactif', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE id = 'd0000002-0000-0000-0000-000000000002');

INSERT INTO rooms (id, name, location, capacity, active, status, description, image_url, created_at, updated_at)
SELECT 'd0000003-0000-0000-0000-000000000003', 'Salle de reunion C301', 'Etage 3 - aile sud', 10, TRUE, 'DISPONIBLE',
       'Petite salle pour reunions d''equipe', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE id = 'd0000003-0000-0000-0000-000000000003');

INSERT INTO rooms (id, name, location, capacity, active, status, description, image_url, created_at, updated_at)
SELECT 'd0000004-0000-0000-0000-000000000004', 'Auditorium principal', 'Rez-de-chaussee', 200, TRUE, 'MAINTENANCE',
       'Auditorium principal - en maintenance preventive jusqu''au 15/09/2026', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE id = 'd0000004-0000-0000-0000-000000000004');

-- ============================================================================
-- 2. EQUIPMENTS (2 demo equipments)
-- ============================================================================
-- Required columns per V1+V3 schema: id, name, serial_number, description,
-- type, location, total_quantity, available_quantity, status, active,
-- created_at, updated_at.
-- chk_equipment_quantities : total_quantity > 0 AND
--                            available_quantity BETWEEN 0 AND total_quantity
-- chk_equipment_status_allowed : status IN
--                            (DISPONIBLE, OCCUPE, MAINTENANCE, INACTIVE)

INSERT INTO equipments (id, name, serial_number, description, type, location, total_quantity, available_quantity, status, active, created_at, updated_at)
SELECT 'e0000001-0000-0000-0000-000000000001', 'Video-projecteur Epson EB-1485Fi', 'VP-EPSON-001',
       'Video-projecteur laser Full HD ultra-courte focale',
       'VIDEO', 'Reserve materiel - etage 1', 5, 5, 'DISPONIBLE', TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM equipments WHERE id = 'e0000001-0000-0000-0000-000000000001');

INSERT INTO equipments (id, name, serial_number, description, type, location, total_quantity, available_quantity, status, active, created_at, updated_at)
SELECT 'e0000002-0000-0000-0000-000000000002', 'Systeme visioconference Polycom Studio', 'VC-POLY-001',
       'Barre de visioconference USB pour salle de reunion',
       'AUDIO_VIDEO', 'Reserve materiel - etage 1', 3, 3, 'DISPONIBLE', TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM equipments WHERE id = 'e0000002-0000-0000-0000-000000000002');

-- ============================================================================
-- 3. RESERVATIONS (3 demo reservations)
-- ============================================================================
-- The chk_reservation_resource_xor constraint requires either room_id or
-- equipment_id to be set, never both, and at least one of the two.
-- reference_code is required NOT NULL by V2, so we set it explicitly here.
-- business_version is required NOT NULL by V2, set to 1.

INSERT INTO reservations (
    id, event_mode, room_id, equipment_id, requester_username,
    start_at, end_at, purpose, status,
    security_conflict, reference_code, business_version, quantity_requested, created_at, updated_at
)
SELECT 'f0000001-0000-0000-0000-000000000001',
       'PRESENTIEL',
       'd0000001-0000-0000-0000-000000000001',
       NULL,
       'mohamed.benali',
       '2026-09-15 08:00:00+00'::TIMESTAMPTZ,
       '2026-09-15 18:00:00+00'::TIMESTAMPTZ,
       'Conference nationale sur le nucleaire civil',
       'APPROVED',
       FALSE,
       'RES-2026-0001', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM reservations WHERE id = 'f0000001-0000-0000-0000-000000000001');

INSERT INTO reservations (
    id, event_mode, room_id, equipment_id, requester_username,
    start_at, end_at, purpose, status,
    security_conflict, reference_code, business_version, quantity_requested, created_at, updated_at
)
SELECT 'f0000002-0000-0000-0000-000000000002',
       'PRESENTIEL',
       'd0000002-0000-0000-0000-000000000002',
       NULL,
       'amina.mansouri',
       '2026-08-20 13:00:00+00'::TIMESTAMPTZ,
       '2026-08-20 17:00:00+00'::TIMESTAMPTZ,
       'Atelier technique surete nucleaire - session Q3',
       'PENDING',
       FALSE,
       'RES-2026-0002', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM reservations WHERE id = 'f0000002-0000-0000-0000-000000000002');

INSERT INTO reservations (
    id, event_mode, room_id, equipment_id, requester_username,
    start_at, end_at, purpose, status,
    security_conflict, reference_code, business_version, quantity_requested, created_at, updated_at
)
SELECT 'f0000003-0000-0000-0000-000000000003',
       'PRESENTIEL',
       NULL,
       'e0000001-0000-0000-0000-000000000001',
       'leila.kacem',
       '2026-10-05 09:00:00+00'::TIMESTAMPTZ,
       '2026-10-05 13:00:00+00'::TIMESTAMPTZ,
       'Pre-test video-projecteur pour seminaire web',
       'APPROVED',
       FALSE,
       'RES-2026-0003', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM reservations WHERE id = 'f0000003-0000-0000-0000-000000000003');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 4 rooms (3 DISPONIBLE + 1 MAINTENANCE), 2 equipments, 3 reservations
-- (2 room + 1 equipment, mix of APPROVED and PENDING).
