-- Harmonisation du workflow événement pour l'administration Workflows.
-- Objectif: circuit métier clair + bouton "Ajouter étape" exploitable via templates restants.

UPDATE workflow_definitions
SET description = 'Circuit de validation des événements (chef, sécurité, DSN, salle, finalisation).',
    updated_by = 'migration_v11'
WHERE workflow_type = 'EVENT_WORKFLOW';

-- Évite les collisions de contrainte uq_workflow_steps_order pendant la remise en ordre.
UPDATE workflow_steps
SET step_order = step_order + 20
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW');

UPDATE workflow_steps
SET step_name = 'Soumission employé',
    step_order = 1,
    responsible_role = 'EMPLOYE',
    required = TRUE,
    refusal_reason_required = FALSE,
    active = TRUE,
    critical = TRUE,
    condition_type = 'TOUJOURS'
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_DRAFT_REVIEW';

INSERT INTO workflow_steps (
    workflow_id, step_code, step_name, step_order, responsible_role, required, refusal_reason_required, active, critical, condition_type
)
VALUES (
    (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW'),
    'EVENT_MANAGER_REVIEW',
    'Validation chef hiérarchique',
    2,
    'CHEF_HIERARCHIQUE',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'TOUJOURS'
)
ON CONFLICT (workflow_id, step_code) DO NOTHING;

UPDATE workflow_steps
SET step_name = 'Validation chef hiérarchique',
    step_order = 2,
    responsible_role = 'CHEF_HIERARCHIQUE',
    required = TRUE,
    refusal_reason_required = TRUE,
    active = TRUE,
    critical = TRUE,
    condition_type = 'TOUJOURS'
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_MANAGER_REVIEW';

UPDATE workflow_steps
SET step_name = 'Validation sécurité',
    step_order = 3,
    responsible_role = 'RESPONSABLE_SECURITE',
    required = TRUE,
    refusal_reason_required = TRUE,
    active = TRUE,
    critical = TRUE,
    condition_type = 'RESERVATION_PHYSIQUE'
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_SECURITY_REVIEW';

UPDATE workflow_steps
SET step_name = 'Validation DSN',
    step_order = 4,
    responsible_role = 'DIRECTEUR_DSN',
    required = TRUE,
    refusal_reason_required = TRUE,
    active = TRUE,
    critical = TRUE,
    condition_type = 'PARTENAIRE_EXTERNE'
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_DSN_APPROVAL';

INSERT INTO workflow_steps (
    workflow_id, step_code, step_name, step_order, responsible_role, required, refusal_reason_required, active, critical, condition_type
)
VALUES (
    (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW'),
    'EVENT_ROOM_PREPARATION',
    'Préparation salle et équipements',
    5,
    'RESPONSABLE_SALLE',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    'RESERVATION_PHYSIQUE'
)
ON CONFLICT (workflow_id, step_code) DO NOTHING;

UPDATE workflow_steps
SET step_name = 'Préparation salle et équipements',
    step_order = 5,
    responsible_role = 'RESPONSABLE_SALLE',
    required = TRUE,
    refusal_reason_required = TRUE,
    active = TRUE,
    critical = FALSE,
    condition_type = 'RESERVATION_PHYSIQUE'
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_ROOM_PREPARATION';

UPDATE workflow_steps
SET step_name = 'Statut final',
    step_order = 6,
    responsible_role = 'RESPONSABLE_QUALITE',
    required = TRUE,
    refusal_reason_required = FALSE,
    active = TRUE,
    critical = FALSE,
    condition_type = 'TOUJOURS'
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_PUBLICATION';

DELETE FROM workflow_step_actions
WHERE step_id IN (
    SELECT ws.id
    FROM workflow_steps ws
    JOIN workflow_definitions wd ON wd.id = ws.workflow_id
    WHERE wd.workflow_type = 'EVENT_WORKFLOW'
);

INSERT INTO workflow_step_actions (step_id, action_type)
SELECT ws.id, action_type
FROM workflow_steps ws
JOIN workflow_definitions wd ON wd.id = ws.workflow_id
JOIN (
    VALUES
        ('EVENT_DRAFT_REVIEW', 'SUBMIT'),
        ('EVENT_MANAGER_REVIEW', 'VALIDATE'),
        ('EVENT_MANAGER_REVIEW', 'REJECT'),
        ('EVENT_MANAGER_REVIEW', 'REQUEST_CHANGES'),
        ('EVENT_SECURITY_REVIEW', 'VALIDATE'),
        ('EVENT_SECURITY_REVIEW', 'REJECT'),
        ('EVENT_DSN_APPROVAL', 'APPROVE'),
        ('EVENT_DSN_APPROVAL', 'REJECT'),
        ('EVENT_ROOM_PREPARATION', 'PROCESS'),
        ('EVENT_ROOM_PREPARATION', 'REJECT'),
        ('EVENT_PUBLICATION', 'PUBLISH'),
        ('EVENT_PUBLICATION', 'CLOSE')
) AS action_map(step_code, action_type)
    ON ws.step_code = action_map.step_code
WHERE wd.workflow_type = 'EVENT_WORKFLOW'
ON CONFLICT DO NOTHING;
