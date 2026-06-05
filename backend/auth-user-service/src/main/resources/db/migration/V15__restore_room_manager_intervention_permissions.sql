-- V15: Ensure the room manager can operate the intervention workflow.

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('VIEW_INTERVENTIONS_MODULE', 'CHANGE_INTERVENTION_STATUS')
WHERE r.name = 'RESPONSABLE_SALLE'
ON CONFLICT DO NOTHING;
