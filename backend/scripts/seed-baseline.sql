\connect auth_user_db
BEGIN;

INSERT INTO departments (code, name, description, active, created_at, updated_at)
VALUES
    ('DSI', 'DSI', 'Direction des Systemes d Information', TRUE, NOW(), NOW()),
    ('ADMIN', 'Administration', 'Service administratif general', TRUE, NOW(), NOW()),
    ('QUAL', 'Qualite', 'Service qualite et conformite', TRUE, NOW(), NOW()),
    ('SEC', 'Securite', 'Service securite operationnelle', TRUE, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active,
    updated_at = NOW();

UPDATE users
SET department_id = d.id,
    updated_at = NOW()
FROM departments d
WHERE users.username IN ('admin.cnstn', 'directeur.cnstn', 'it.cnstn')
  AND d.code = 'DSI';

UPDATE users
SET department_id = d.id,
    updated_at = NOW()
FROM departments d
WHERE users.username IN ('employe.cnstn', 'chef.cnstn')
  AND d.code = 'ADMIN';

UPDATE users
SET department_id = d.id,
    updated_at = NOW()
FROM departments d
WHERE users.username = 'qualite.cnstn'
  AND d.code = 'QUAL';

UPDATE users
SET department_id = d.id,
    updated_at = NOW()
FROM departments d
WHERE users.username IN ('securite.cnstn', 'salle.cnstn')
  AND d.code = 'SEC';

COMMIT;

\connect reservation_db
BEGIN;

INSERT INTO rooms (id, name, location, capacity, active, created_at, updated_at, description, status)
SELECT
  '11111111-1111-1111-1111-111111111001'::uuid,
  'Salle Atlas',
  'Batiment A - Niveau 1',
  30,
  TRUE,
  NOW(),
  NOW(),
  'Salle de reunion principale pour comites',
  'DISPONIBLE'
WHERE NOT EXISTS (
  SELECT 1 FROM rooms WHERE name = 'Salle Atlas'
);

INSERT INTO rooms (id, name, location, capacity, active, created_at, updated_at, description, status)
SELECT
  '11111111-1111-1111-1111-111111111002'::uuid,
  'Salle Orion',
  'Batiment B - Niveau 2',
  18,
  TRUE,
  NOW(),
  NOW(),
  'Salle collaborative pour ateliers et formations',
  'DISPONIBLE'
WHERE NOT EXISTS (
  SELECT 1 FROM rooms WHERE name = 'Salle Orion'
);

INSERT INTO equipments (
  id,
  name,
  serial_number,
  description,
  active,
  created_at,
  updated_at,
  type,
  location,
  total_quantity,
  available_quantity,
  status
)
SELECT
  '11111111-1111-1111-1111-111111112001'::uuid,
  'Projecteur Laser Epson',
  'EPS-LZR-9001',
  'Projecteur principal pour salles de reunion',
  TRUE,
  NOW(),
  NOW(),
  'Materiel audiovisuel',
  'Batiment A - Stock audiovisuel',
  2,
  1,
  'DISPONIBLE'
WHERE NOT EXISTS (
  SELECT 1 FROM equipments WHERE serial_number = 'EPS-LZR-9001'
);

INSERT INTO equipments (
  id,
  name,
  serial_number,
  description,
  active,
  created_at,
  updated_at,
  type,
  location,
  total_quantity,
  available_quantity,
  status
)
SELECT
  '11111111-1111-1111-1111-111111112002'::uuid,
  'Kit Visioconference Logitech',
  'LOG-VC-3100',
  'Camera, micro et haut-parleur pour reunions hybrides',
  TRUE,
  NOW(),
  NOW(),
  'Materiel IT',
  'Batiment B - Salle multimedia',
  1,
  0,
  'OCCUPE'
WHERE NOT EXISTS (
  SELECT 1 FROM equipments WHERE serial_number = 'LOG-VC-3100'
);

INSERT INTO reservations (
  id,
  event_id,
  event_mode,
  reference_code,
  business_version,
  quantity_requested,
  created_at,
  end_at,
  purpose,
  requester_username,
  security_checked_by,
  security_conflict,
  start_at,
  status,
  updated_at,
  equipment_id,
  room_id
)
SELECT
  '11111111-1111-1111-1111-111111113001'::uuid,
  '22222222-2222-2222-2222-222222221001'::uuid,
  'PRESENTIEL',
  'RES-2026-0001',
  1,
  1,
  NOW(),
  NOW() + INTERVAL '1 day 2 hours',
  'Comite technique hebdomadaire',
  'employe.cnstn',
  'securite.cnstn',
  FALSE,
  NOW() + INTERVAL '1 day',
  'APPROVED',
  NOW(),
  NULL,
  (SELECT id FROM rooms WHERE name = 'Salle Atlas' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM reservations WHERE id = '11111111-1111-1111-1111-111111113001'::uuid
);

INSERT INTO reservations (
  id,
  event_id,
  event_mode,
  reference_code,
  business_version,
  quantity_requested,
  created_at,
  end_at,
  purpose,
  requester_username,
  security_checked_by,
  security_conflict,
  start_at,
  status,
  updated_at,
  equipment_id,
  room_id
)
SELECT
  '11111111-1111-1111-1111-111111113002'::uuid,
  '22222222-2222-2222-2222-222222221002'::uuid,
  'HYBRIDE',
  'RES-2026-0002',
  1,
  1,
  NOW(),
  NOW() + INTERVAL '2 days 1 hour',
  'Atelier securite operationnelle',
  'chef.cnstn',
  NULL,
  FALSE,
  NOW() + INTERVAL '2 days',
  'PENDING',
  NOW(),
  (SELECT id FROM equipments WHERE serial_number = 'LOG-VC-3100' LIMIT 1),
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM reservations WHERE id = '11111111-1111-1111-1111-111111113002'::uuid
);

COMMIT;

\connect event_db
BEGIN;

INSERT INTO events (
  id,
  reference_code,
  event_type,
  event_mode,
  workflow_step,
  business_version,
  has_external_partners,
  created_at,
  decided_by,
  decision_comment,
  description,
  end_at,
  location,
  requested_by,
  start_at,
  status,
  title,
  updated_at,
  online_event
)
SELECT
  '22222222-2222-2222-2222-222222221001'::uuid,
  'EVT-2026-0001',
  'REUNION',
  'PRESENTIEL',
  'TERMINE',
  1,
  FALSE,
  NOW(),
  'chef.cnstn',
  'Plan valide',
  'Revue mensuelle des indicateurs securite',
  NOW() + INTERVAL '5 days 2 hours',
  'Salle Atlas',
  'employe.cnstn',
  NOW() + INTERVAL '5 days',
  'APPROVED',
  'Revue securite mensuelle',
  NOW(),
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM events WHERE title = 'Revue securite mensuelle'
);

INSERT INTO events (
  id,
  reference_code,
  event_type,
  event_mode,
  workflow_step,
  business_version,
  has_external_partners,
  created_at,
  decided_by,
  decision_comment,
  description,
  end_at,
  location,
  requested_by,
  start_at,
  status,
  title,
  updated_at,
  online_event
)
SELECT
  '22222222-2222-2222-2222-222222221002'::uuid,
  'EVT-2026-0002',
  'FORMATION',
  'EN_LIGNE',
  'VALIDATION_MANAGER',
  1,
  TRUE,
  NOW(),
  NULL,
  NULL,
  'Session de sensibilisation cyber pour les equipes',
  NOW() + INTERVAL '8 days 2 hours',
  'En ligne',
  'employe.cnstn',
  NOW() + INTERVAL '8 days',
  'PENDING',
  'Session cyber interne',
  NOW(),
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM events WHERE title = 'Session cyber interne'
);

INSERT INTO partner_invitations (id, access_approved, created_at, partner_email, partner_name, event_id)
SELECT
  '22222222-2222-2222-2222-222222222001'::uuid,
  FALSE,
  NOW(),
  'contact@partenaire-tech.tn',
  'Partenaire Tech',
  (SELECT id FROM events WHERE title = 'Session cyber interne' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM partner_invitations WHERE partner_email = 'contact@partenaire-tech.tn'
);

COMMIT;

\connect intervention_db
BEGIN;

INSERT INTO interventions (
  id,
  assigned_to,
  created_at,
  description,
  requested_by,
  status,
  title,
  updated_at,
  validated_by,
  validation_note
)
SELECT
  '33333333-3333-3333-3333-333333331001'::uuid,
  'salle.cnstn',
  NOW(),
  'Le videoprojecteur ne demarre plus dans la salle Atlas.',
  'employe.cnstn',
  'IN_PROGRESS',
  'Panne videoprojecteur salle Atlas',
  NOW(),
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM interventions WHERE title = 'Panne videoprojecteur salle Atlas'
);

INSERT INTO interventions (
  id,
  assigned_to,
  created_at,
  description,
  requested_by,
  status,
  title,
  updated_at,
  validated_by,
  validation_note
)
SELECT
  '33333333-3333-3333-3333-333333331002'::uuid,
  NULL,
  NOW(),
  'Maintenance preventive des detecteurs de securite.',
  'securite.cnstn',
  'REQUESTED',
  'Maintenance detecteurs',
  NOW(),
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM interventions WHERE title = 'Maintenance detecteurs'
);

COMMIT;

\connect ged_db
BEGIN;

INSERT INTO documents (
  id,
  approved_by,
  category,
  content,
  created_at,
  created_by,
  published_at,
  status,
  title,
  updated_at
)
SELECT
  '44444444-4444-4444-4444-444444441001'::uuid,
  'qualite.cnstn',
  'Procedure',
  'Procedure officielle de gestion des incidents techniques.',
  NOW(),
  'qualite.cnstn',
  NOW(),
  'PUBLISHED',
  'Procedure gestion incidents',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE title = 'Procedure gestion incidents'
);

INSERT INTO documents (
  id,
  approved_by,
  category,
  content,
  created_at,
  created_by,
  published_at,
  status,
  title,
  updated_at
)
SELECT
  '44444444-4444-4444-4444-444444441002'::uuid,
  NULL,
  'Guide',
  'Guide de preparation des salles pour evenements sensibles.',
  NOW(),
  'salle.cnstn',
  NULL,
  'IN_REVIEW',
  'Guide preparation salles',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM documents WHERE title = 'Guide preparation salles'
);

COMMIT;

\connect notification_db
BEGIN;

INSERT INTO notifications (
  id,
  created_at,
  message,
  read_flag,
  recipient_username,
  title,
  updated_at
)
SELECT
  '55555555-5555-5555-5555-555555551001'::uuid,
  NOW(),
  'Votre reservation pour Salle Atlas est confirmee.',
  FALSE,
  'employe.cnstn',
  'Reservation confirmee',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM notifications WHERE id = '55555555-5555-5555-5555-555555551001'::uuid
);

INSERT INTO notifications (
  id,
  created_at,
  message,
  read_flag,
  recipient_username,
  title,
  updated_at
)
SELECT
  '55555555-5555-5555-5555-555555551002'::uuid,
  NOW(),
  'Une nouvelle demande d intervention attend votre prise en charge.',
  FALSE,
  'salle.cnstn',
  'Nouvelle intervention',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM notifications WHERE id = '55555555-5555-5555-5555-555555551002'::uuid
);

COMMIT;
