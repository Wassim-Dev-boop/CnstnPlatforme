-- Ensure the room manager can access GED as expected by the UI and permission policy.
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'VIEW_GED_MODULE'
WHERE r.name = 'RESPONSABLE_SALLE'
ON CONFLICT DO NOTHING;
