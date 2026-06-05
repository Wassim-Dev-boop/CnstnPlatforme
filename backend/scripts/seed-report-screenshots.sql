\connect auth_user_db
BEGIN;

UPDATE users
SET first_name = CASE username
        WHEN 'admin.cnstn' THEN 'Nadia'
        WHEN 'employe.cnstn' THEN 'Amine'
        WHEN 'chef.cnstn' THEN 'Karim'
        WHEN 'salle.cnstn' THEN 'Sarra'
        WHEN 'securite.cnstn' THEN 'Mehdi'
        WHEN 'directeur.cnstn' THEN 'Hichem'
        WHEN 'qualite.cnstn' THEN 'Leila'
        WHEN 'it.cnstn' THEN 'Youssef'
        ELSE first_name
    END,
    last_name = CASE username
        WHEN 'admin.cnstn' THEN 'Ben Salem'
        WHEN 'employe.cnstn' THEN 'Trabelsi'
        WHEN 'chef.cnstn' THEN 'Mansouri'
        WHEN 'salle.cnstn' THEN 'Gharbi'
        WHEN 'securite.cnstn' THEN 'Jebali'
        WHEN 'directeur.cnstn' THEN 'Haddad'
        WHEN 'qualite.cnstn' THEN 'Bouzid'
        WHEN 'it.cnstn' THEN 'Kacem'
        ELSE last_name
    END,
    phone = CASE username
        WHEN 'admin.cnstn' THEN '+216 71 537 100'
        WHEN 'employe.cnstn' THEN '+216 25 418 620'
        WHEN 'chef.cnstn' THEN '+216 22 904 118'
        WHEN 'salle.cnstn' THEN '+216 21 775 430'
        WHEN 'securite.cnstn' THEN '+216 27 334 912'
        WHEN 'directeur.cnstn' THEN '+216 98 216 044'
        WHEN 'qualite.cnstn' THEN '+216 26 641 503'
        WHEN 'it.cnstn' THEN '+216 24 509 773'
        ELSE phone
    END,
    updated_at = NOW()
WHERE username IN (
    'admin.cnstn', 'employe.cnstn', 'chef.cnstn', 'salle.cnstn',
    'securite.cnstn', 'directeur.cnstn', 'qualite.cnstn', 'it.cnstn'
);

INSERT INTO workflow_audit_logs (workflow_type, action_type, actor_username, old_config, new_config, created_at, comment)
VALUES
  ('EVENT_WORKFLOW', 'STEP_UPDATED', 'admin.cnstn', 'Validation manager facultative', 'Validation manager obligatoire', NOW() - INTERVAL '5 days', 'Renforcement du controle des evenements externes'),
  ('RESERVATION_WORKFLOW', 'WORKFLOW_ACTIVATED', 'admin.cnstn', 'active=false', 'active=true', NOW() - INTERVAL '4 days', 'Activation apres validation DSI'),
  ('GED_WORKFLOW', 'STEP_REORDERED', 'qualite.cnstn', 'Brouillon > Publication', 'Brouillon > Relecture > Publication', NOW() - INTERVAL '3 days', 'Ajout de la revue qualite'),
  ('IT_INTERVENTION_WORKFLOW', 'STEP_UPDATED', 'it.cnstn', 'Resolution directe', 'Diagnostic puis resolution', NOW() - INTERVAL '2 days', 'Traiter les demandes critiques en priorite'),
  ('USER_ACCESS_WORKFLOW', 'PERMISSION_UPDATED', 'admin.cnstn', 'Lecture seule', 'Lecture et modification', NOW() - INTERVAL '1 day', 'Delegation aux responsables metiers')
ON CONFLICT DO NOTHING;

INSERT INTO it_equipment (name, serial_number, category_id, brand, model, state, assignment_status, description, current_employee_id, created_at, updated_at)
SELECT item.name, item.serial_number, cat.id, item.brand, item.model, item.state, item.assignment_status, item.description, item.current_employee_id, NOW(), NOW()
FROM (VALUES
  ('PC Portable Dell Latitude 5440 - DSI', 'CNSTN-LAP-024', 'Ordinateur portable', 'Dell', 'Latitude 5440', 'OPERATIONAL', 'ASSIGNED', 'Poste mobile affecte au service DSI', 'employe.cnstn'),
  ('Station HP Z2 Mini - Radioprotection', 'CNSTN-WS-018', 'PC', 'HP', 'Z2 Mini G9', 'OPERATIONAL', 'ASSIGNED', 'Station de calcul pour rapports techniques', 'chef.cnstn'),
  ('Imprimante Xerox Qualite', 'CNSTN-PRN-011', 'Imprimante', 'Xerox', 'VersaLink C405', 'MAINTENANCE', 'NOT_ASSIGNED', 'Imprimante couleur du bureau qualite', NULL),
  ('Scanner Canon GED', 'CNSTN-SCN-007', 'Scanner', 'Canon', 'DR-C240', 'OPERATIONAL', 'ASSIGNED', 'Numerisation des dossiers qualite', 'qualite.cnstn'),
  ('Switch Cisco Laboratoire', 'CNSTN-NET-014', 'Réseau', 'Cisco', 'CBS350-24T', 'OPERATIONAL', 'NOT_ASSIGNED', 'Switch reseau laboratoire analyse', NULL),
  ('Telephone IP Direction', 'CNSTN-TEL-009', 'Téléphone IP', 'Yealink', 'T46U', 'OPERATIONAL', 'ASSIGNED', 'Telephone IP direction DSN', 'directeur.cnstn'),
  ('Ecran Dell Salle Atlas', 'CNSTN-MON-031', 'Écran', 'Dell', 'P2422H', 'OPERATIONAL', 'ASSIGNED', 'Ecran de support salle Atlas', 'salle.cnstn'),
  ('Routeur Fortinet Perimetre', 'CNSTN-NET-021', 'Réseau', 'Fortinet', 'FortiGate 60F', 'OPERATIONAL', 'NOT_ASSIGNED', 'Equipement de securite reseau', NULL)
) AS item(name, serial_number, category_name, brand, model, state, assignment_status, description, current_employee_id)
JOIN it_equipment_categories cat ON cat.name = item.category_name
WHERE NOT EXISTS (SELECT 1 FROM it_equipment e WHERE e.serial_number = item.serial_number);

INSERT INTO it_equipment_assignments (equipment_id, employee_id, employee_name, assigned_at, assigned_by, status, created_at, updated_at)
SELECT e.id, e.current_employee_id,
       CASE e.current_employee_id
         WHEN 'employe.cnstn' THEN 'Amine Trabelsi'
         WHEN 'chef.cnstn' THEN 'Karim Mansouri'
         WHEN 'qualite.cnstn' THEN 'Leila Bouzid'
         WHEN 'directeur.cnstn' THEN 'Hichem Haddad'
         WHEN 'salle.cnstn' THEN 'Sarra Gharbi'
         ELSE 'Agent CNSTN'
       END,
       NOW() - INTERVAL '20 days', 'it.cnstn', 'ACTIVE', NOW(), NOW()
FROM it_equipment e
WHERE e.current_employee_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM it_equipment_assignments a WHERE a.equipment_id = e.id AND a.status = 'ACTIVE');

COMMIT;

\connect event_db
BEGIN;

WITH report_events AS (
  SELECT *
  FROM (VALUES
    ('80000000-0000-0000-0000-000000000001'::uuid, 'EVT-RPT-001', 'Comite de suivi radioprotection', 'Revue mensuelle des indicateurs de radioprotection et des actions correctives.', 0, 9, 2, 'Salle Atlas', 'REUNION', 'PRESENTIEL', FALSE, 'employe.cnstn', 'APPROVED', 'TERMINE', FALSE),
    ('80000000-0000-0000-0000-000000000002'::uuid, 'EVT-RPT-002', 'Atelier qualite ISO 17025', 'Atelier interne pour preparer les audits du laboratoire.', 1, 10, 3, 'Salle Carthage', 'FORMATION', 'PRESENTIEL', FALSE, 'qualite.cnstn', 'APPROVED', 'TERMINE', FALSE),
    ('80000000-0000-0000-0000-000000000003'::uuid, 'EVT-RPT-003', 'Seminaire surete nucleaire', 'Intervention hybride avec partenaires universitaires.', 2, 14, 2, 'Auditorium Ibn Khaldoun', 'SEMINAIRE', 'HYBRIDE', TRUE, 'chef.cnstn', 'PENDING', 'VALIDATION_SECURITE', TRUE),
    ('80000000-0000-0000-0000-000000000004'::uuid, 'EVT-RPT-004', 'Reunion coordination DSI', 'Planification des interventions IT prioritaires.', 3, 11, 1, 'Salle Orion', 'REUNION', 'PRESENTIEL', FALSE, 'it.cnstn', 'APPROVED', 'TERMINE', FALSE),
    ('80000000-0000-0000-0000-000000000005'::uuid, 'EVT-RPT-005', 'Formation gestion documentaire', 'Formation GED pour les responsables de services.', 4, 9, 2, 'Salle Atlas', 'FORMATION', 'PRESENTIEL', FALSE, 'qualite.cnstn', 'APPROVED', 'TERMINE', FALSE),
    ('80000000-0000-0000-0000-000000000006'::uuid, 'EVT-RPT-006', 'Journee portes ouvertes CNSTN', 'Programme de vulgarisation scientifique pour visiteurs externes.', 5, 10, 4, 'Hall principal', 'CONFERENCE', 'PRESENTIEL', TRUE, 'directeur.cnstn', 'PENDING', 'VALIDATION_DSN', TRUE),
    ('80000000-0000-0000-0000-000000000007'::uuid, 'EVT-RPT-007', 'Briefing securite visiteurs', 'Briefing obligatoire avant visite du pole technologique.', 6, 8, 1, 'Salle Sidi Thabet', 'REUNION', 'PRESENTIEL', FALSE, 'securite.cnstn', 'APPROVED', 'TERMINE', FALSE),
    ('80000000-0000-0000-0000-000000000008'::uuid, 'EVT-RPT-008', 'Webinaire instrumentation nucleaire', 'Session a distance avec demonstration des protocoles de mesure.', 7, 15, 2, 'En ligne', 'FORMATION', 'EN_LIGNE', TRUE, 'employe.cnstn', 'APPROVED', 'TERMINE', TRUE),
    ('80000000-0000-0000-0000-000000000009'::uuid, 'EVT-RPT-009', 'Comite achat equipements', 'Arbitrage des besoins en equipements scientifiques et IT.', 8, 10, 2, 'Salle Carthage', 'REUNION', 'PRESENTIEL', FALSE, 'chef.cnstn', 'APPROVED', 'TERMINE', FALSE),
    ('80000000-0000-0000-0000-000000000010'::uuid, 'EVT-RPT-010', 'Audit interne processus IT', 'Audit croise entre DSI et qualite.', 9, 13, 3, 'Salle Orion', 'ATELIER', 'HYBRIDE', FALSE, 'qualite.cnstn', 'PENDING', 'VALIDATION_MANAGER', FALSE),
    ('80000000-0000-0000-0000-000000000011'::uuid, 'EVT-RPT-011', 'Reunion plan continuite activite', 'Scenario de reprise apres incident technique majeur.', 10, 9, 2, 'Salle Atlas', 'REUNION', 'PRESENTIEL', FALSE, 'directeur.cnstn', 'APPROVED', 'TERMINE', FALSE),
    ('80000000-0000-0000-0000-000000000012'::uuid, 'EVT-RPT-012', 'Atelier culture radiologique', 'Atelier collaboratif pour supports de sensibilisation.', 11, 14, 3, 'Auditorium Ibn Khaldoun', 'ATELIER', 'PRESENTIEL', TRUE, 'employe.cnstn', 'DRAFT', 'BROUILLON', TRUE)
  ) AS v(id, reference_code, title, description, day_offset, start_hour, duration_hours, location, event_type, event_mode, online_event, requested_by, status, workflow_step, has_external_partners)
)
INSERT INTO events (
  id, reference_code, title, description, start_at, end_at, location, event_type, event_mode,
  online_event, requested_by, status, workflow_step, business_version, has_external_partners,
  submitted_by, submitted_at, decided_by, decision_comment, created_at, updated_at,
  online_meeting_provider, online_meeting_link
)
SELECT
  id, reference_code, title, description,
  (date_trunc('week', NOW()) + day_offset * INTERVAL '1 day' + start_hour * INTERVAL '1 hour'),
  (date_trunc('week', NOW()) + day_offset * INTERVAL '1 day' + (start_hour + duration_hours) * INTERVAL '1 hour'),
  location, event_type, event_mode, online_event, requested_by, status, workflow_step, 1,
  has_external_partners, requested_by, NOW() - INTERVAL '2 days',
  CASE WHEN status = 'APPROVED' THEN 'chef.cnstn' ELSE NULL END,
  CASE WHEN status = 'APPROVED' THEN 'Valide pour execution' ELSE NULL END,
  NOW() - INTERVAL '4 days', NOW(),
  CASE WHEN online_event THEN 'Teams' ELSE NULL END,
  CASE WHEN online_event THEN 'https://meet.cnstn.local/demo' ELSE NULL END
FROM report_events
ON CONFLICT (reference_code) DO UPDATE
SET title = EXCLUDED.title, description = EXCLUDED.description, start_at = EXCLUDED.start_at,
    end_at = EXCLUDED.end_at, location = EXCLUDED.location, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO event_photos (id, event_id, file_name, content_type, file_size, uploaded_by, archived, created_at, content)
SELECT gen_random_uuid(), e.id, photo.file_name, 'image/png', 92, 'employe.cnstn', FALSE, NOW() - photo.age * INTERVAL '1 hour',
       decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64')
FROM events e
CROSS JOIN (VALUES
  ('accueil-participants.png', 1),
  ('atelier-laboratoire.png', 2),
  ('table-ronde-cnstn.png', 3),
  ('photo-groupe-sidi-thabet.png', 4)
) AS photo(file_name, age)
WHERE e.reference_code = 'EVT-RPT-001'
  AND NOT EXISTS (SELECT 1 FROM event_photos p WHERE p.event_id = e.id AND p.file_name = photo.file_name);

COMMIT;

\connect reservation_db
BEGIN;

WITH report_rooms AS (
  SELECT *
  FROM (VALUES
    ('81000000-0000-0000-0000-000000000001'::uuid, 'Salle Carthage', 'Batiment A - Niveau 2', 24, 'Salle pour comites mixtes et ateliers qualite', 'DISPONIBLE'),
    ('81000000-0000-0000-0000-000000000002'::uuid, 'Auditorium Ibn Khaldoun', 'Batiment C - Rez-de-chaussee', 80, 'Auditorium pour conferences et formations', 'DISPONIBLE'),
    ('81000000-0000-0000-0000-000000000003'::uuid, 'Salle Sidi Thabet', 'Batiment B - Niveau 1', 16, 'Salle de briefing securite visiteurs', 'OCCUPEE'),
    ('81000000-0000-0000-0000-000000000004'::uuid, 'Salle Hannibal', 'Batiment D - Direction', 12, 'Salle de reunion direction', 'MAINTENANCE')
  ) AS v(id, name, location, capacity, description, status)
)
INSERT INTO rooms (id, name, location, capacity, active, created_at, updated_at, description, status, image_url)
SELECT id, name, location, capacity, TRUE, NOW(), NOW(), description, status,
       'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1200'
FROM report_rooms
ON CONFLICT (name) DO UPDATE
SET location = EXCLUDED.location, capacity = EXCLUDED.capacity, description = EXCLUDED.description,
    status = EXCLUDED.status, image_url = EXCLUDED.image_url, updated_at = NOW();

WITH report_reservations AS (
  SELECT *
  FROM (VALUES
    ('82000000-0000-0000-0000-000000000001'::uuid, 'EVT-RPT-001', 'Salle Atlas', 'RES-RPT-001', 0, 9, 2, 'Comite de suivi radioprotection', 'employe.cnstn', 'APPROVED'),
    ('82000000-0000-0000-0000-000000000002'::uuid, 'EVT-RPT-002', 'Salle Carthage', 'RES-RPT-002', 1, 10, 3, 'Atelier qualite ISO 17025', 'qualite.cnstn', 'APPROVED'),
    ('82000000-0000-0000-0000-000000000003'::uuid, 'EVT-RPT-003', 'Auditorium Ibn Khaldoun', 'RES-RPT-003', 2, 14, 2, 'Seminaire surete nucleaire', 'chef.cnstn', 'PENDING'),
    ('82000000-0000-0000-0000-000000000004'::uuid, 'EVT-RPT-004', 'Salle Orion', 'RES-RPT-004', 3, 11, 1, 'Coordination DSI', 'it.cnstn', 'APPROVED'),
    ('82000000-0000-0000-0000-000000000005'::uuid, 'EVT-RPT-005', 'Salle Atlas', 'RES-RPT-005', 4, 9, 2, 'Formation GED', 'qualite.cnstn', 'APPROVED'),
    ('82000000-0000-0000-0000-000000000006'::uuid, 'EVT-RPT-006', 'Auditorium Ibn Khaldoun', 'RES-RPT-006', 5, 10, 4, 'Journee portes ouvertes', 'directeur.cnstn', 'PENDING'),
    ('82000000-0000-0000-0000-000000000007'::uuid, 'EVT-RPT-007', 'Salle Sidi Thabet', 'RES-RPT-007', 6, 8, 1, 'Briefing securite visiteurs', 'securite.cnstn', 'APPROVED'),
    ('82000000-0000-0000-0000-000000000008'::uuid, 'EVT-RPT-009', 'Salle Carthage', 'RES-RPT-008', 8, 10, 2, 'Comite achat equipements', 'chef.cnstn', 'APPROVED')
  ) AS v(id, event_ref, room_name, reference_code, day_offset, start_hour, duration_hours, purpose, requester_username, status)
)
INSERT INTO reservations (
  id, event_id, event_mode, reference_code, business_version, quantity_requested,
  created_at, end_at, purpose, requester_username, security_checked_by, security_conflict,
  security_checked_at, security_decision_comment, start_at, status, updated_at, room_id, equipment_id
)
SELECT
  rr.id, ('80000000-0000-0000-0000-' || lpad(substring(rr.event_ref from '([0-9]+)$'), 12, '0'))::uuid,
  'PRESENTIEL', rr.reference_code, 1, 1, NOW() - INTERVAL '5 days',
  date_trunc('week', NOW()) + rr.day_offset * INTERVAL '1 day' + (rr.start_hour + rr.duration_hours) * INTERVAL '1 hour',
  rr.purpose, rr.requester_username, 'securite.cnstn', FALSE, NOW() - INTERVAL '1 day',
  'Controle securite effectue',
  date_trunc('week', NOW()) + rr.day_offset * INTERVAL '1 day' + rr.start_hour * INTERVAL '1 hour',
  rr.status, NOW(), r.id, NULL
FROM report_reservations rr
JOIN rooms r ON r.name = rr.room_name
ON CONFLICT (reference_code) DO UPDATE
SET start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, status = EXCLUDED.status, updated_at = NOW();

COMMIT;

\connect ged_db
BEGIN;

WITH root_folders AS (
  SELECT *
  FROM (VALUES
    ('83000000-0000-0000-0000-000000000001'::uuid, 'Procedures qualite', NULL::uuid, 'Qualite'),
    ('83000000-0000-0000-0000-000000000002'::uuid, 'Radioprotection', NULL::uuid, 'Technique'),
    ('83000000-0000-0000-0000-000000000003'::uuid, 'Securite et acces', NULL::uuid, 'Securite'),
    ('83000000-0000-0000-0000-000000000004'::uuid, 'Administration', NULL::uuid, 'Administration')
  ) AS v(id, name, parent_id, category)
)
INSERT INTO ged_folders (id, name, parent_id, category, archived, created_by, created_at, updated_at)
SELECT id, name, parent_id, category, FALSE, 'qualite.cnstn', NOW(), NOW()
FROM root_folders
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, updated_at = NOW();

WITH report_docs AS (
  SELECT gs AS n,
         ('84000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid AS id,
         CASE (gs % 4)
           WHEN 0 THEN 'Procedures qualite'
           WHEN 1 THEN 'Radioprotection'
           WHEN 2 THEN 'Securite et acces'
           ELSE 'Administration'
         END AS folder_name,
         CASE (gs % 5)
           WHEN 0 THEN 'Procedure'
           WHEN 1 THEN 'Instruction'
           WHEN 2 THEN 'Formulaire'
           WHEN 3 THEN 'Compte rendu'
           ELSE 'Guide'
         END AS category,
         CASE (gs % 4)
           WHEN 0 THEN 'PUBLIC'
           WHEN 1 THEN 'INTERNAL'
           WHEN 2 THEN 'RESTRICTED'
           ELSE 'CONFIDENTIAL'
         END AS confidentiality,
         CASE (gs % 4)
           WHEN 0 THEN 'PUBLISHED'
           WHEN 1 THEN 'APPROVED'
           WHEN 2 THEN 'IN_REVIEW'
           ELSE 'DRAFT'
         END AS status
  FROM generate_series(1, 28) AS gs
)
INSERT INTO documents (
  id, title, category, sub_category, content, description, folder_id, reference_code,
  owner_service, confidentiality_level, status, archived, current_version_number,
  created_by, approved_by, published_at, created_at, updated_at
)
SELECT
  d.id,
  CASE d.n
    WHEN 1 THEN 'Procedure controle radioprotection'
    WHEN 2 THEN 'Plan accueil visiteurs sensibles'
    WHEN 3 THEN 'Compte rendu audit qualite laboratoire'
    WHEN 4 THEN 'Guide gestion incidents IT'
    WHEN 5 THEN 'Fiche verification salle Atlas'
    ELSE 'Document CNSTN ' || lpad(d.n::text, 2, '0') || ' - ' || d.category
  END,
  d.category,
  CASE WHEN d.n % 2 = 0 THEN 'Operationnel' ELSE 'Conformite' END,
  'Contenu de demonstration pour la GED du rapport PFE.',
  'Document metier avec historique, version et droits ACL pour capture rapport.',
  f.id,
  'GED-RPT-' || lpad(d.n::text, 3, '0'),
  CASE d.folder_name
    WHEN 'Procedures qualite' THEN 'Qualite'
    WHEN 'Radioprotection' THEN 'DSI'
    WHEN 'Securite et acces' THEN 'Securite'
    ELSE 'Administration'
  END,
  d.confidentiality,
  d.status,
  FALSE,
  1,
  'qualite.cnstn',
  CASE WHEN d.status IN ('APPROVED', 'PUBLISHED') THEN 'qualite.cnstn' ELSE NULL END,
  CASE WHEN d.status = 'PUBLISHED' THEN NOW() - INTERVAL '2 days' ELSE NULL END,
  NOW() - (d.n || ' days')::interval,
  NOW()
FROM report_docs d
JOIN ged_folders f ON f.name = d.folder_name
ON CONFLICT (reference_code) DO UPDATE
SET title = EXCLUDED.title, category = EXCLUDED.category, folder_id = EXCLUDED.folder_id,
    confidentiality_level = EXCLUDED.confidentiality_level, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO document_versions (id, document_id, version_number, file_name, mime_type, file_size, content_text, change_note, created_by, created_at, is_current, content_bytes)
SELECT gen_random_uuid(), d.id, 1,
       lower(replace(d.reference_code, '-', '_')) || '.txt',
       'text/plain', 256,
       'Version initiale du document ' || d.reference_code,
       'Version chargee pour le dossier de rapport',
       d.created_by, d.created_at, TRUE,
       convert_to('Version initiale GED CNSTN', 'UTF8')
FROM documents d
WHERE d.reference_code LIKE 'GED-RPT-%'
  AND NOT EXISTS (SELECT 1 FROM document_versions v WHERE v.document_id = d.id AND v.version_number = 1);

INSERT INTO document_acl_entries (id, document_id, acl_type, acl_value, created_by, created_at)
SELECT gen_random_uuid(), d.id, acl.acl_type, acl.acl_value, 'qualite.cnstn', NOW()
FROM documents d
CROSS JOIN (VALUES
  ('ROLE', 'QUALITY_MANAGER'),
  ('ROLE', 'ADMIN'),
  ('SERVICE', 'Qualite'),
  ('SERVICE', 'DSI')
) AS acl(acl_type, acl_value)
WHERE d.reference_code IN ('GED-RPT-001', 'GED-RPT-002', 'GED-RPT-003', 'GED-RPT-004')
ON CONFLICT (document_id, acl_type, acl_value) DO NOTHING;

COMMIT;

\connect intervention_db
BEGIN;

WITH report_interventions AS (
  SELECT *
  FROM (VALUES
    ('85000000-0000-0000-0000-000000000001'::uuid, 'Remplacement disque poste DSI', 'Le disque SSD du poste affecte a Amine Trabelsi presente des erreurs SMART.', 'employe.cnstn', 'it.cnstn', 'REQUESTED', 'SUBMITTED', 'MATERIEL', 'HAUTE', 'PC Portable Dell Latitude 5440 - DSI'),
    ('85000000-0000-0000-0000-000000000002'::uuid, 'Connexion reseau intermittente laboratoire', 'Perte de connectivite sur le VLAN laboratoire analyse.', 'chef.cnstn', 'it.cnstn', 'IN_PROGRESS', 'IT_IN_CHARGE', 'RESEAU', 'CRITIQUE', 'Switch Cisco Laboratoire'),
    ('85000000-0000-0000-0000-000000000003'::uuid, 'Mise a jour antivirus postes qualite', 'Mise a jour centralisee a deployer sur les postes qualite.', 'qualite.cnstn', 'it.cnstn', 'IN_PROGRESS', 'IT_IN_PROGRESS', 'LOGICIEL', 'MOYENNE', 'Scanner Canon GED'),
    ('85000000-0000-0000-0000-000000000004'::uuid, 'Incident imprimante bureau qualite', 'Bourrages repetes et traces sur impressions couleur.', 'qualite.cnstn', 'it.cnstn', 'COMPLETED', 'IT_RESOLVED', 'MATERIEL', 'MOYENNE', 'Imprimante Xerox Qualite'),
    ('85000000-0000-0000-0000-000000000005'::uuid, 'Cloture demande telephone direction', 'Remplacement combine IP et verification appels entrants.', 'directeur.cnstn', 'it.cnstn', 'VALIDATED', 'IT_CLOSED', 'TELEPHONIE', 'BASSE', 'Telephone IP Direction'),
    ('85000000-0000-0000-0000-000000000006'::uuid, 'Demande compte collaborateur stagiaire', 'Creation acces temporaire pour stagiaire laboratoire.', 'chef.cnstn', NULL, 'REQUESTED', 'MANAGER_APPROVAL_PENDING', 'ACCES', 'MOYENNE', NULL),
    ('85000000-0000-0000-0000-000000000007'::uuid, 'Diagnostic lenteur GED', 'Temps de chargement eleve lors de l ouverture des dossiers GED.', 'qualite.cnstn', 'it.cnstn', 'IN_PROGRESS', 'IT_IN_PROGRESS', 'APPLICATION', 'HAUTE', NULL),
    ('85000000-0000-0000-0000-000000000008'::uuid, 'Validation sauvegarde mensuelle', 'Controle des journaux de sauvegarde et restauration test.', 'it.cnstn', 'it.cnstn', 'COMPLETED', 'IT_RESOLVED', 'INFRASTRUCTURE', 'MOYENNE', NULL),
    ('85000000-0000-0000-0000-000000000009'::uuid, 'Cloture incident video salle Atlas', 'Cable HDMI remplace et projecteur teste avec succes.', 'salle.cnstn', 'it.cnstn', 'VALIDATED', 'IT_CLOSED', 'AUDIOVISUEL', 'BASSE', 'Ecran Dell Salle Atlas'),
    ('85000000-0000-0000-0000-000000000010'::uuid, 'Affectation ordinateur portable mission', 'Preparation poste mobile pour mission technique externe.', 'directeur.cnstn', NULL, 'REQUESTED', 'SUBMITTED', 'MATERIEL', 'MOYENNE', NULL),
    ('85000000-0000-0000-0000-000000000011'::uuid, 'Incident pare-feu perimetre', 'Alerte haute charge CPU sur le routeur Fortinet.', 'securite.cnstn', 'it.cnstn', 'IN_PROGRESS', 'IT_IN_CHARGE', 'SECURITE', 'CRITIQUE', 'Routeur Fortinet Perimetre'),
    ('85000000-0000-0000-0000-000000000012'::uuid, 'Resolution probleme scanner GED', 'Pilote scanner reconfigure sur poste qualite.', 'qualite.cnstn', 'it.cnstn', 'COMPLETED', 'IT_RESOLVED', 'MATERIEL', 'BASSE', 'Scanner Canon GED'),
    ('85000000-0000-0000-0000-000000000013'::uuid, 'Cloture installation ecran salle', 'Installation terminee et reception signee par responsable salle.', 'salle.cnstn', 'it.cnstn', 'VALIDATED', 'IT_CLOSED', 'MATERIEL', 'BASSE', 'Ecran Dell Salle Atlas'),
    ('85000000-0000-0000-0000-000000000014'::uuid, 'Nouvelle demande acces VPN', 'Acces VPN temporaire pour audit interne.', 'employe.cnstn', NULL, 'REQUESTED', 'MANAGER_APPROVAL_PENDING', 'ACCES', 'HAUTE', NULL),
    ('85000000-0000-0000-0000-000000000015'::uuid, 'Traitement ticket messagerie', 'Probleme de reception des notifications emails.', 'admin.cnstn', 'it.cnstn', 'IN_PROGRESS', 'IT_IN_PROGRESS', 'APPLICATION', 'MOYENNE', NULL)
  ) AS v(id, title, description, requested_by, assigned_to, status, it_workflow_status, intervention_type, priority, equipment_label)
)
INSERT INTO interventions (
  id, title, description, requested_by, assigned_to, status, it_workflow_status, intervention_type,
  priority, it_priority, is_it_workflow, it_responsible_id, equipment_id, location,
  created_at, updated_at, manager_id, manager_approved, manager_approved_at,
  dsn_id, dsn_approved, dsn_approved_at, it_processing_started_at,
  it_diagnostic_comment, resolution, resolved_at, validated_by, validation_note, satisfaction_rating
)
SELECT
  id, title, description, requested_by, assigned_to, status, it_workflow_status, intervention_type,
  priority, priority, TRUE, assigned_to, equipment_label, 'CNSTN Sidi Thabet',
  NOW() - INTERVAL '10 days', NOW(),
  'chef.cnstn', CASE WHEN it_workflow_status NOT IN ('SUBMITTED', 'MANAGER_APPROVAL_PENDING') THEN TRUE ELSE NULL END,
  CASE WHEN it_workflow_status NOT IN ('SUBMITTED', 'MANAGER_APPROVAL_PENDING') THEN NOW() - INTERVAL '8 days' ELSE NULL END,
  'directeur.cnstn', CASE WHEN it_workflow_status IN ('IT_IN_CHARGE', 'IT_IN_PROGRESS', 'IT_RESOLVED', 'IT_CLOSED') THEN TRUE ELSE NULL END,
  CASE WHEN it_workflow_status IN ('IT_IN_CHARGE', 'IT_IN_PROGRESS', 'IT_RESOLVED', 'IT_CLOSED') THEN NOW() - INTERVAL '7 days' ELSE NULL END,
  CASE WHEN it_workflow_status IN ('IT_IN_PROGRESS', 'IT_RESOLVED', 'IT_CLOSED') THEN NOW() - INTERVAL '6 days' ELSE NULL END,
  CASE WHEN it_workflow_status IN ('IT_IN_PROGRESS', 'IT_RESOLVED', 'IT_CLOSED') THEN 'Diagnostic effectue par equipe IT' ELSE NULL END,
  CASE WHEN it_workflow_status IN ('IT_RESOLVED', 'IT_CLOSED') THEN 'Resolution appliquee et controle final effectue.' ELSE NULL END,
  CASE WHEN it_workflow_status IN ('IT_RESOLVED', 'IT_CLOSED') THEN NOW() - INTERVAL '2 days' ELSE NULL END,
  CASE WHEN it_workflow_status = 'IT_CLOSED' THEN requested_by ELSE NULL END,
  CASE WHEN it_workflow_status = 'IT_CLOSED' THEN 'Service retabli et valide utilisateur.' ELSE NULL END,
  CASE WHEN it_workflow_status = 'IT_CLOSED' THEN 5 ELSE NULL END
FROM report_interventions
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status,
    it_workflow_status = EXCLUDED.it_workflow_status, priority = EXCLUDED.priority,
    assigned_to = EXCLUDED.assigned_to, updated_at = NOW();

INSERT INTO it_intervention_transitions (id, intervention_id, actor_id, actor_role, from_status, to_status, note, created_at)
SELECT gen_random_uuid(), i.id, t.actor_id, t.actor_role, t.from_status, t.to_status, t.note, NOW() - t.age * INTERVAL '1 day'
FROM interventions i
JOIN (VALUES
  ('85000000-0000-0000-0000-000000000001'::uuid, 'employe.cnstn', 'EMPLOYEE', NULL, 'SUBMITTED', 'Demande soumise', 10),
  ('85000000-0000-0000-0000-000000000002'::uuid, 'it.cnstn', 'IT_MANAGER', 'DSN_APPROVED', 'IT_IN_CHARGE', 'Prise en charge', 7),
  ('85000000-0000-0000-0000-000000000003'::uuid, 'it.cnstn', 'IT_MANAGER', 'IT_IN_CHARGE', 'IT_IN_PROGRESS', 'Diagnostic en cours', 6),
  ('85000000-0000-0000-0000-000000000004'::uuid, 'it.cnstn', 'IT_MANAGER', 'IT_IN_PROGRESS', 'IT_RESOLVED', 'Resolution appliquee', 2),
  ('85000000-0000-0000-0000-000000000005'::uuid, 'directeur.cnstn', 'DSN_DIRECTOR', 'IT_RESOLVED', 'IT_CLOSED', 'Cloture validee', 1)
) AS t(intervention_id, actor_id, actor_role, from_status, to_status, note, age)
ON i.id = t.intervention_id
WHERE NOT EXISTS (
  SELECT 1 FROM it_intervention_transitions existing
  WHERE existing.intervention_id = i.id AND existing.to_status = t.to_status
);

COMMIT;

\connect notification_db
BEGIN;

INSERT INTO notifications (id, created_at, message, read_flag, recipient_username, title, updated_at, action_url, email_delivery_status)
SELECT ('86000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
       NOW() - (gs || ' hours')::interval,
       CASE gs
         WHEN 1 THEN 'Votre reservation Salle Atlas est confirmee pour le comite de suivi.'
         WHEN 2 THEN 'Une intervention IT critique vient de vous etre affectee.'
         WHEN 3 THEN 'Le document Procedure controle radioprotection attend votre relecture.'
         WHEN 4 THEN 'Nouvelle invitation au seminaire surete nucleaire.'
         WHEN 5 THEN 'Le workflow GED a ete mis a jour par le responsable qualite.'
         WHEN 6 THEN 'Votre demande VPN attend validation hierarchique.'
         ELSE 'Notification de demonstration CNSTN numero ' || gs
       END,
       (gs % 3 = 0),
       CASE WHEN gs IN (2, 7) THEN 'it.cnstn' WHEN gs IN (3, 5) THEN 'qualite.cnstn' ELSE 'employe.cnstn' END,
       CASE gs
         WHEN 1 THEN 'Reservation confirmee'
         WHEN 2 THEN 'Ticket IT affecte'
         WHEN 3 THEN 'Relecture GED'
         WHEN 4 THEN 'Invitation evenement'
         WHEN 5 THEN 'Workflow mis a jour'
         WHEN 6 THEN 'Validation acces'
         ELSE 'Alerte CNSTN'
       END,
       NOW() - (gs || ' hours')::interval,
       CASE WHEN gs IN (2, 7) THEN '/it/interventions' WHEN gs IN (3, 5) THEN '/documents' ELSE '/notifications' END,
       'SENT'
FROM generate_series(1, 10) AS gs
ON CONFLICT (id) DO UPDATE
SET message = EXCLUDED.message, read_flag = EXCLUDED.read_flag, recipient_username = EXCLUDED.recipient_username,
    title = EXCLUDED.title, updated_at = NOW(), action_url = EXCLUDED.action_url;

COMMIT;
