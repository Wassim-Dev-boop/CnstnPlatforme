-- Create new users with realistic names
INSERT INTO users (id, username, email, first_name, last_name, phone, enabled, department_id, created_at, updated_at)
VALUES 
    ('u0000002-0000-0000-0000-000000000002', 'mohamed.benali', 'mohamed.benali@cnstn.tn', 'Mohamed', 'Ben Ali', '+21695001234', TRUE, '3c733297-62f7-4b42-a2af-a40995809045', NOW(), NOW()),
    ('u0000003-0000-0000-0000-000000000003', 'sami.trabelsi', 'sami.trabelsi@cnstn.tn', 'Sami', 'Trabelsi', '+21695001235', TRUE, '6f115926-dfa5-4990-a3e5-9248e10ab393', NOW(), NOW()),
    ('u0000004-0000-0000-0000-000000000004', 'amina.mansouri', 'amina.mansouri@cnstn.tn', 'Amina', 'Mansouri', '+21695001236', TRUE, '6f115926-dfa5-4990-a3e5-9248e10ab393', NOW(), NOW()),
    ('u0000005-0000-0000-0000-000000000005', 'karim.haddad', 'karim.haddad@cnstn.tn', 'Karim', 'Haddad', '+21695001237', TRUE, '7d6e96ca-025a-437b-894f-75e42ad11f69', NOW(), NOW()),
    ('u0000006-0000-0000-0000-000000000006', 'leila.kacem', 'leila.kacem@cnstn.tn', 'Leila', 'Kacem', '+21695001238', TRUE, '8be9e76b-5aef-4019-b30b-7d6b9d8dbdf7', NOW(), NOW()),
    ('u0000007-0000-0000-0000-000000000007', 'youssef.gharbi', 'youssef.gharbi@cnstn.tn', 'Youssef', 'Gharbi', '+21695001239', TRUE, '6f115926-dfa5-4990-a3e5-9248e10ab393', NOW(), NOW()),
    ('u0000008-0000-0000-0000-000000000008', 'nabil.ferchichi', 'nabil.ferchichi@cnstn.tn', 'Nabil', 'Ferchichi', '+21695001240', TRUE, '6f115926-dfa5-4990-a3e5-9248e10ab393', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Assign roles to new users
INSERT INTO user_roles (user_id, role_id)
SELECT 'u0000002-0000-0000-0000-000000000002', id FROM roles WHERE name = 'EMPLOYE'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'u0000003-0000-0000-0000-000000000003', id FROM roles WHERE name = 'CHEF_HIERARCHIQUE'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'u0000004-0000-0000-0000-000000000004', id FROM roles WHERE name = 'RESPONSABLE_SALLE'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'u0000005-0000-0000-0000-000000000005', id FROM roles WHERE name = 'RESPONSABLE_SECURITE'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'u0000006-0000-0000-0000-000000000006', id FROM roles WHERE name = 'RESPONSABLE_QUALITE'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'u0000007-0000-0000-0000-000000000007', id FROM roles WHERE name = 'RESPONSABLE_IT'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'u0000008-0000-0000-0000-000000000008', id FROM roles WHERE name = 'DIRECTEUR_DSN'
ON CONFLICT DO NOTHING;

-- Create additional departments
INSERT INTO departments (id, code, name, description, active, created_at, updated_at)
VALUES 
    ('f0000001-0000-0000-0000-000000000001', 'SRH', 'Service Ressources Humaines', 'Service gestion des ressources humaines', TRUE, NOW(), NOW()),
    ('f0000002-0000-0000-0000-000000000002', 'SLG', 'Service Logistique', 'Service logistique et facilities', TRUE, NOW(), NOW()),
    ('f0000003-0000-0000-0000-000000000003', 'SFM', 'Service Formation', 'Service formation et développement', TRUE, NOW(), NOW()),
    ('f0000004-0000-0000-0000-000000000004', 'SDD', 'Service Documentation', 'Service documentation et archivage', TRUE, NOW(), NOW()),
    ('f0000005-0000-0000-0000-000000000005', 'SRD', 'Service Recherche et Développement', 'Service recherche et développement', TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

SELECT COUNT(*) as new_users FROM users WHERE username IN ('mohamed.benali', 'sami.trabelsi', 'amina.mansouri', 'karim.haddad', 'leila.kacem', 'youssef.gharbi', 'nabil.ferchichi');
