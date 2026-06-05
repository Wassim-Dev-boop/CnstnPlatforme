-- V13: normaliser le workflow Evenement pour la version livrable.
-- Circuit attendu:
-- Employe -> Chef hierarchique -> Responsable securite -> Directeur DSN (si partenaire externe)
-- -> Responsable salle (si presentiel/hybride) -> finalisation.

UPDATE workflow_definitions
SET description = 'Circuit de validation des événements (employé, chef, sécurité, DSN, salle, finalisation).',
    updated_by = 'migration_v13'
WHERE workflow_type = 'EVENT_WORKFLOW';

-- Evite les collisions de contrainte unique (workflow_id, step_order) pendant la remise en ordre.
UPDATE workflow_steps
SET step_order = step_order + 30
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW');

UPDATE workflow_steps
SET step_order = 1,
    step_name = 'Soumission employé',
    responsible_role = 'EMPLOYE',
    condition_type = 'TOUJOURS',
    required = TRUE,
    refusal_reason_required = FALSE,
    active = TRUE
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_DRAFT_REVIEW';

UPDATE workflow_steps
SET step_order = 2,
    step_name = 'Validation chef hiérarchique',
    responsible_role = 'CHEF_HIERARCHIQUE',
    condition_type = 'TOUJOURS',
    required = TRUE,
    refusal_reason_required = TRUE,
    active = TRUE
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_MANAGER_REVIEW';

UPDATE workflow_steps
SET step_order = 3,
    step_name = 'Validation sécurité',
    responsible_role = 'RESPONSABLE_SECURITE',
    condition_type = 'RESERVATION_PHYSIQUE',
    required = TRUE,
    refusal_reason_required = TRUE,
    active = TRUE
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_SECURITY_REVIEW';

UPDATE workflow_steps
SET step_order = 4,
    step_name = 'Validation DSN',
    responsible_role = 'DIRECTEUR_DSN',
    condition_type = 'PARTENAIRE_EXTERNE',
    required = TRUE,
    refusal_reason_required = TRUE,
    active = TRUE
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_DSN_APPROVAL';

UPDATE workflow_steps
SET step_order = 5,
    step_name = 'Préparation salle et équipements',
    responsible_role = 'RESPONSABLE_SALLE',
    condition_type = 'RESERVATION_PHYSIQUE',
    required = TRUE,
    refusal_reason_required = TRUE,
    active = TRUE
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_ROOM_PREPARATION';

UPDATE workflow_steps
SET step_order = 6,
    step_name = 'Statut final',
    responsible_role = 'RESPONSABLE_QUALITE',
    condition_type = 'TOUJOURS',
    required = TRUE,
    refusal_reason_required = FALSE,
    active = TRUE
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_PUBLICATION';
