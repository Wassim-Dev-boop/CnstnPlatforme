-- V9: Permissions DSN + donnees de demonstration parc IT

-- La DSN doit pouvoir consulter les interventions IT a valider
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'VIEW_INTERVENTIONS_MODULE'
WHERE r.name = 'DIRECTEUR_DSN'
ON CONFLICT DO NOTHING;

-- Utilisateur demo referent DSN pour le parc IT
INSERT INTO users(username, email, first_name, last_name, phone, enabled)
VALUES ('it.cnstn', 'it@cnstn.tn', 'Referent', 'DSN', '+21620000017', TRUE)
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    enabled = EXCLUDED.enabled,
    updated_at = NOW();

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'DIRECTEUR_DSN'
WHERE u.username = 'it.cnstn'
ON CONFLICT DO NOTHING;

-- Equipements IT de demonstration metier (noms demandes)
INSERT INTO it_equipment(name, serial_number, category_id, brand, model, state, assignment_status, description)
SELECT
    'PC Portable Dell DSI-001',
    'DSI-001',
    c.id,
    'Dell',
    'Latitude 5540',
    'OPERATIONAL',
    'NOT_ASSIGNED',
    'PC portable affectable a un employe'
FROM it_equipment_categories c
WHERE c.name = 'Ordinateur portable'
  AND NOT EXISTS (SELECT 1 FROM it_equipment e WHERE e.serial_number = 'DSI-001');

INSERT INTO it_equipment(name, serial_number, category_id, brand, model, state, assignment_status, description)
SELECT
    'Imprimante HP ADM-002',
    'ADM-002',
    c.id,
    'HP',
    'LaserJet MFP',
    'OPERATIONAL',
    'NOT_ASSIGNED',
    'Imprimante departement administratif'
FROM it_equipment_categories c
WHERE c.name = 'Imprimante'
  AND NOT EXISTS (SELECT 1 FROM it_equipment e WHERE e.serial_number = 'ADM-002');

INSERT INTO it_equipment(name, serial_number, category_id, brand, model, state, assignment_status, description)
SELECT
    'Scanner Canon GED-003',
    'GED-003',
    c.id,
    'Canon',
    'DR-C230',
    'OPERATIONAL',
    'NOT_ASSIGNED',
    'Scanner bureau GED'
FROM it_equipment_categories c
WHERE c.name = 'Scanner'
  AND NOT EXISTS (SELECT 1 FROM it_equipment e WHERE e.serial_number = 'GED-003');

-- Affectation demo: PC Portable Dell DSI-001 -> employe.cnstn
INSERT INTO it_equipment_assignments (equipment_id, employee_id, employee_name, assigned_at, assigned_by, status)
SELECT
    e.id,
    'employe.cnstn',
    'Employe CNSTN',
    NOW(),
    'it.cnstn',
    'ACTIVE'
FROM it_equipment e
WHERE e.serial_number = 'DSI-001'
  AND NOT EXISTS (
      SELECT 1 FROM it_equipment_assignments a
      WHERE a.equipment_id = e.id AND a.status = 'ACTIVE' AND a.returned_at IS NULL
  );

UPDATE it_equipment
SET assignment_status = 'ASSIGNED',
    current_employee_id = 'employe.cnstn',
    updated_at = NOW()
WHERE serial_number = 'DSI-001'
  AND EXISTS (
      SELECT 1 FROM it_equipment_assignments a
      WHERE a.equipment_id = it_equipment.id AND a.status = 'ACTIVE' AND a.returned_at IS NULL
  );
