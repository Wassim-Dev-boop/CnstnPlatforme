INSERT INTO users(username, email, first_name, last_name, phone, enabled)
VALUES
    ('admin.cnstn', 'admin@cnstn.tn', 'Admin', 'CNSTN', '+21620000010', TRUE),
    ('employe.cnstn', 'employe@cnstn.tn', 'Employe', 'CNSTN', '+21620000011', TRUE),
    ('chef.cnstn', 'chef@cnstn.tn', 'Chef', 'Hierarchique', '+21620000012', TRUE),
    ('salle.cnstn', 'salle@cnstn.tn', 'Responsable', 'Salle', '+21620000013', TRUE),
    ('securite.cnstn', 'securite@cnstn.tn', 'Responsable', 'Securite', '+21620000014', TRUE),
    ('directeur.cnstn', 'directeur@cnstn.tn', 'Directeur', 'DSN', '+21620000015', TRUE),
    ('qualite.cnstn', 'qualite@cnstn.tn', 'Responsable', 'Qualite', '+21620000016', TRUE)
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
JOIN roles r ON r.name = 'ADMIN'
WHERE u.username = 'admin.cnstn'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'EMPLOYE'
WHERE u.username = 'employe.cnstn'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'CHEF_HIERARCHIQUE'
WHERE u.username = 'chef.cnstn'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'RESPONSABLE_SALLE'
WHERE u.username = 'salle.cnstn'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'RESPONSABLE_SECURITE'
WHERE u.username = 'securite.cnstn'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'DIRECTEUR_DSN'
WHERE u.username = 'directeur.cnstn'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'RESPONSABLE_QUALITE'
WHERE u.username = 'qualite.cnstn'
ON CONFLICT DO NOTHING;
