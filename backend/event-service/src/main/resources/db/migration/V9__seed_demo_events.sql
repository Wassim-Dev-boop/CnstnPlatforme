-- ============================================================================
-- V9: SEED DEMO EVENTS FOR CNSTN INTRANET (PFE REPORT)
-- ============================================================================
-- Date      : 2026-06-04
-- Purpose   : Provide 4 realistic demo events covering the full workflow
--              (DRAFT, PENDING_VALIDATION, APPROVED, REJECTED) for UI
--              screenshots in the final year project report.
-- Idempotent: every INSERT uses ON CONFLICT DO NOTHING.
-- Notes     :
--   * events.location  is a free VARCHAR(150) - no FK, no dependency on
--     reservation_db.rooms (which is in another schema).
--   * events.meeting_room_id stays NULL for PRESENTIEL events (V7 rule).
--   * requested_by / submitted_by use real usernames seeded in auth_user_db.
-- ============================================================================

-- ============================================================================
-- 1. EVENT #1 - Approved conference (PRESENTIEL)
-- ============================================================================
INSERT INTO events (
    id, title, description, start_at, end_at, location,
    event_type, event_mode, online_event,
    requested_by, status, workflow_step, business_version,
    has_external_partners,
    submitted_by, submitted_at,
    manager_decision_by, manager_decision_at, manager_decision_comment,
    security_decision_by, security_decision_at, security_decision_comment,
    dsn_decision_by, dsn_decision_at, dsn_decision_comment,
    decision_comment, decided_by,
    reference_code,
    meeting_room_id,
    created_at, updated_at
)
SELECT
    'b0000001-0000-0000-0000-000000000001',
    'Conference nationale sur le nucleaire civil',
    'Conference annuelle organisee par le CNSTN reunissant chercheurs et industriels du secteur nucleaire tunisien.',
    '2026-09-15 09:00:00+00'::TIMESTAMPTZ,
    '2026-09-15 17:00:00+00'::TIMESTAMPTZ,
    'Auditorium principal - siege social CNSTN',
    'CONFERENCE', 'PRESENTIEL', FALSE,
    'mohamed.benali', 'APPROVED', 'TERMINE', 1, FALSE,
    'mohamed.benali', '2026-06-10 10:00:00+00'::TIMESTAMPTZ,
    'sami.trabelsi', '2026-06-11 14:00:00+00'::TIMESTAMPTZ, 'Plan logistique valide.',
    'karim.haddad', '2026-06-12 09:00:00+00'::TIMESTAMPTZ, 'Aucune preoccupation securitaire.',
    'nabil.ferchichi', '2026-06-13 16:00:00+00'::TIMESTAMPTZ, 'Approuve par la direction.',
    'Evenement valide', 'nabil.ferchichi',
    'EVT-2026-0001',
    NULL,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM events WHERE id = 'b0000001-0000-0000-0000-000000000001');

-- ============================================================================
-- 2. EVENT #2 - Pending validation workshop (HYBRIDE)
-- ============================================================================
INSERT INTO events (
    id, title, description, start_at, end_at, location,
    event_type, event_mode, online_event,
    requested_by, status, workflow_step, business_version,
    has_external_partners,
    submitted_by, submitted_at,
    manager_decision_by, manager_decision_at, manager_decision_comment,
    reference_code,
    meeting_room_id,
    created_at, updated_at
)
SELECT
    'b0000002-0000-0000-0000-000000000002',
    'Atelier technique surete nucleaire - session Q3',
    'Atelier interne sur les procedures de surete nucleaire, ouvert aux partenaires externes en visioconference.',
    '2026-08-20 13:30:00+00'::TIMESTAMPTZ,
    '2026-08-20 16:30:00+00'::TIMESTAMPTZ,
    'Salle B201 - 2eme etage',
    'ATELIER', 'HYBRIDE', TRUE,
    'amina.mansouri', 'PENDING', 'VALIDATION_MANAGER', 1, TRUE,
    'amina.mansouri', '2026-07-01 11:00:00+00'::TIMESTAMPTZ,
    NULL, NULL, NULL,
    'EVT-2026-0002',
    NULL,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM events WHERE id = 'b0000002-0000-0000-0000-000000000002');

-- ============================================================================
-- 3. EVENT #3 - Draft seminar (EN_LIGNE)
-- ============================================================================
INSERT INTO events (
    id, title, description, start_at, end_at, location,
    event_type, event_mode, online_event,
    online_meeting_provider, online_meeting_link,
    requested_by, status, workflow_step, business_version,
    has_external_partners,
    reference_code,
    meeting_room_id,
    created_at, updated_at
)
SELECT
    'b0000003-0000-0000-0000-000000000003',
    'Seminaire web - applications pacifiques de l''energie nucleaire',
    'Seminaire en ligne sur les applications medicales et industrielles du nucleaire.',
    '2026-10-05 10:00:00+00'::TIMESTAMPTZ,
    '2026-10-05 12:00:00+00'::TIMESTAMPTZ,
    NULL,
    'SEMINAIRE', 'EN_LIGNE', TRUE,
    'CNSTN_VISIO', 'https://visio.cnstn.tn/j/8402-1294',
    'leila.kacem', 'DRAFT', 'BROUILLON', 1, FALSE,
    'EVT-2026-0003',
    'EVT-B0000003',
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM events WHERE id = 'b0000003-0000-0000-0000-000000000003');

-- ============================================================================
-- 4. EVENT #4 - Rejected visit (PRESENTIEL)
-- ============================================================================
INSERT INTO events (
    id, title, description, start_at, end_at, location,
    event_type, event_mode, online_event,
    requested_by, status, workflow_step, business_version,
    has_external_partners,
    submitted_by, submitted_at,
    manager_decision_by, manager_decision_at, manager_decision_comment,
    rejection_reason, decided_by,
    reference_code,
    meeting_room_id,
    created_at, updated_at
)
SELECT
    'b0000004-0000-0000-0000-000000000004',
    'Visite scolaire - lycee de La Marsa',
    'Visite demande par un lycee de La Marsa pour 40 eleves.',
    '2026-07-10 09:00:00+00'::TIMESTAMPTZ,
    '2026-07-10 11:00:00+00'::TIMESTAMPTZ,
    'Hall principal - siege social',
    'VISITE_PARTENAIRE', 'PRESENTIEL', FALSE,
    'youssef.gharbi', 'REJECTED', 'REFUSE', 1, FALSE,
    'youssef.gharbi', '2026-06-20 09:00:00+00'::TIMESTAMPTZ,
    'sami.trabelsi', '2026-06-22 10:00:00+00'::TIMESTAMPTZ,
    'Effectif trop important pour la jauge actuelle de la salle.',
    'Effectif superieur a la capacite d''accueil securitaire.', 'sami.trabelsi',
    'EVT-2026-0004',
    NULL,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM events WHERE id = 'b0000004-0000-0000-0000-000000000004');

-- ============================================================================
-- 5. INTERNAL INVITATIONS for approved event #1
-- ============================================================================
INSERT INTO event_invitations (
    id, event_id, invited_username, invited_email, invited_display_name,
    invited_by_username, invited_by_display_name,
    message, status, expires_at, created_at, updated_at
)
SELECT
    'c0000001-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000001',
    'mohamed.benali', 'mohamed.benali@cnstn.tn', 'Mohamed Ben Ali',
    'admin.cnstn', 'Admin CNSTN',
    'Vous etes invite a la conference nationale sur le nucleaire civil.', 'ACCEPTED',
    '2026-09-15 09:00:00+00'::TIMESTAMPTZ, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM event_invitations WHERE id = 'c0000001-0000-0000-0000-000000000001');

INSERT INTO event_invitations (
    id, event_id, invited_username, invited_email, invited_display_name,
    invited_by_username, invited_by_display_name,
    message, status, expires_at, created_at, updated_at
)
SELECT
    'c0000002-0000-0000-0000-000000000002',
    'b0000001-0000-0000-0000-000000000001',
    'leila.kacem', 'leila.kacem@cnstn.tn', 'Leila Kacem',
    'admin.cnstn', 'Admin CNSTN',
    'Vous etes invitee a la conference nationale sur le nucleaire civil.', 'PENDING',
    '2026-09-15 09:00:00+00'::TIMESTAMPTZ, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM event_invitations WHERE id = 'c0000002-0000-0000-0000-000000000002');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 4 events inserted (workflow coverage: APPROVED / PENDING / DRAFT / REJECTED).
-- 2 internal invitations inserted for the APPROVED conference.
