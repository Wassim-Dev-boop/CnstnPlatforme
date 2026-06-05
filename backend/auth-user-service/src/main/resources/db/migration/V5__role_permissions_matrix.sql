CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'VIEW_USERS_MODULE',
    'VIEW_EVENTS_MODULE',
    'VIEW_GED_MODULE',
    'VIEW_INTERVENTIONS_MODULE',
    'VIEW_REPORTS_MODULE',
    'CREATE_USER',
    'UPDATE_USER',
    'CREATE_EVENT',
    'VALIDATE_EVENT',
    'PUBLISH_DOCUMENT',
    'CHANGE_INTERVENTION_STATUS'
)
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'VIEW_EVENTS_MODULE',
    'VIEW_GED_MODULE',
    'VIEW_INTERVENTIONS_MODULE',
    'VIEW_REPORTS_MODULE',
    'CREATE_EVENT'
)
WHERE r.name = 'EMPLOYE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'VIEW_EVENTS_MODULE',
    'VIEW_GED_MODULE',
    'VIEW_INTERVENTIONS_MODULE',
    'VIEW_REPORTS_MODULE',
    'CREATE_EVENT',
    'VALIDATE_EVENT'
)
WHERE r.name = 'CHEF_HIERARCHIQUE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'VIEW_INTERVENTIONS_MODULE',
    'VIEW_REPORTS_MODULE',
    'CHANGE_INTERVENTION_STATUS'
)
WHERE r.name = 'RESPONSABLE_SALLE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'VIEW_REPORTS_MODULE'
)
WHERE r.name = 'RESPONSABLE_SECURITE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'VIEW_EVENTS_MODULE',
    'VIEW_REPORTS_MODULE',
    'VALIDATE_EVENT'
)
WHERE r.name = 'DIRECTEUR_DSN'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'VIEW_EVENTS_MODULE',
    'VIEW_GED_MODULE',
    'VIEW_REPORTS_MODULE',
    'CREATE_EVENT',
    'PUBLISH_DOCUMENT',
    'VIEW_INTERVENTIONS_MODULE'
)
WHERE r.name = 'RESPONSABLE_QUALITE'
ON CONFLICT DO NOTHING;
