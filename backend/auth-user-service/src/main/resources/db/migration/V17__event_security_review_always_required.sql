-- V17: la validation du responsable securite est obligatoire pour tout evenement,
-- quel que soit le mode (presentiel, hybride ou en ligne).

UPDATE workflow_steps
SET condition_type = 'TOUJOURS',
    required = TRUE,
    active = TRUE
WHERE workflow_id = (SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW')
  AND step_code = 'EVENT_SECURITY_REVIEW';

UPDATE workflow_definitions
SET description = 'Circuit de validation des événements (employé, chef, sécurité obligatoire, DSN si partenaire, salle si physique, finalisation).',
    updated_by = 'migration_v17'
WHERE workflow_type = 'EVENT_WORKFLOW';
