INSERT INTO roles(name, description, system_role)
VALUES ('RESPONSABLE_IT', 'Responsable IT', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'VIEW_INTERVENTIONS_MODULE'
WHERE r.name = 'RESPONSABLE_IT'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'RESPONSABLE_IT'
WHERE u.username = 'it.cnstn'
ON CONFLICT DO NOTHING;
