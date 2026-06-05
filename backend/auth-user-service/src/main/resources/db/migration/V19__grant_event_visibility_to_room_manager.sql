-- V19: Le responsable salle doit consulter les evenements pour executer
-- la decision de salle dans le workflow evenement.

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'VIEW_EVENTS_MODULE'
WHERE r.name = 'RESPONSABLE_SALLE'
ON CONFLICT DO NOTHING;
