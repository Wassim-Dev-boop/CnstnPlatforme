CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type VARCHAR(64) NOT NULL UNIQUE,
    workflow_name VARCHAR(160) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    step_code VARCHAR(80) NOT NULL,
    step_name VARCHAR(160) NOT NULL,
    step_order INTEGER NOT NULL,
    responsible_role VARCHAR(64) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    refusal_reason_required BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    critical BOOLEAN NOT NULL DEFAULT FALSE,
    condition_type VARCHAR(64) NOT NULL DEFAULT 'TOUJOURS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_workflow_steps_definition FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    CONSTRAINT uq_workflow_steps_order UNIQUE (workflow_id, step_order),
    CONSTRAINT uq_workflow_steps_code UNIQUE (workflow_id, step_code)
);

CREATE TABLE IF NOT EXISTS workflow_step_actions (
    step_id UUID NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    PRIMARY KEY (step_id, action_type),
    CONSTRAINT fk_workflow_step_actions_step FOREIGN KEY (step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    actor_username VARCHAR(120) NOT NULL,
    old_config TEXT,
    new_config TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_audit_logs_type_created_at
    ON workflow_audit_logs (workflow_type, created_at DESC);

INSERT INTO workflow_definitions (workflow_type, workflow_name, description, active, updated_by)
VALUES
    ('EVENT_WORKFLOW', 'Workflow événement', 'Validation et publication des événements.', TRUE, 'system'),
    ('ROOM_RESERVATION_WORKFLOW', 'Workflow réservation salle', 'Traitement des demandes de réservation des salles.', TRUE, 'system'),
    ('EQUIPMENT_RESERVATION_WORKFLOW', 'Workflow réservation équipement', 'Traitement des demandes de réservation des équipements.', TRUE, 'system'),
    ('EXTERNAL_PARTNER_WORKFLOW', 'Workflow partenaire externe', 'Validation des accès partenaires externes.', TRUE, 'system'),
    ('INTERVENTION_WORKFLOW', 'Workflow intervention', 'Suivi des demandes d''intervention technique.', TRUE, 'system'),
    ('GED_DOCUMENT_WORKFLOW', 'Workflow document GED', 'Contrôle qualité et publication des documents GED.', TRUE, 'system')
ON CONFLICT (workflow_type) DO NOTHING;

INSERT INTO workflow_steps (
    workflow_id, step_code, step_name, step_order, responsible_role, required, refusal_reason_required, active, critical, condition_type
)
VALUES
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW'), 'EVENT_DRAFT_REVIEW', 'Préparation et soumission', 1, 'EMPLOYE', TRUE, FALSE, TRUE, TRUE, 'TOUJOURS'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW'), 'EVENT_SECURITY_REVIEW', 'Validation sécurité', 2, 'RESPONSABLE_SECURITE', TRUE, TRUE, TRUE, TRUE, 'EVENEMENT_PRESENTIEL'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW'), 'EVENT_DSN_APPROVAL', 'Décision DSN', 3, 'DIRECTEUR_DSN', TRUE, TRUE, TRUE, TRUE, 'EVENEMENT_HYBRIDE'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EVENT_WORKFLOW'), 'EVENT_PUBLICATION', 'Publication', 4, 'RESPONSABLE_QUALITE', TRUE, FALSE, TRUE, FALSE, 'TOUJOURS'),

    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'ROOM_RESERVATION_WORKFLOW'), 'ROOM_REQUEST_REVIEW', 'Demande de réservation', 1, 'EMPLOYE', TRUE, FALSE, TRUE, TRUE, 'RESERVATION_PHYSIQUE'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'ROOM_RESERVATION_WORKFLOW'), 'ROOM_SECURITY_REVIEW', 'Validation sécurité', 2, 'RESPONSABLE_SECURITE', TRUE, TRUE, TRUE, TRUE, 'RESERVATION_PHYSIQUE'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'ROOM_RESERVATION_WORKFLOW'), 'ROOM_CONFIRMATION', 'Confirmation finale', 3, 'RESPONSABLE_SALLE', TRUE, TRUE, TRUE, FALSE, 'RESERVATION_PHYSIQUE'),

    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EQUIPMENT_RESERVATION_WORKFLOW'), 'EQUIPMENT_REQUEST_REVIEW', 'Demande équipement', 1, 'EMPLOYE', TRUE, FALSE, TRUE, TRUE, 'RESERVATION_PHYSIQUE'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EQUIPMENT_RESERVATION_WORKFLOW'), 'EQUIPMENT_SECURITY_REVIEW', 'Validation sécurité', 2, 'RESPONSABLE_SECURITE', TRUE, TRUE, TRUE, TRUE, 'RESERVATION_PHYSIQUE'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EQUIPMENT_RESERVATION_WORKFLOW'), 'EQUIPMENT_CONFIRMATION', 'Confirmation matériel', 3, 'RESPONSABLE_SALLE', TRUE, TRUE, TRUE, FALSE, 'RESERVATION_PHYSIQUE'),

    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EXTERNAL_PARTNER_WORKFLOW'), 'PARTNER_REQUEST_REVIEW', 'Demande d''accès partenaire', 1, 'EMPLOYE', TRUE, FALSE, TRUE, TRUE, 'PARTENAIRE_EXTERNE'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EXTERNAL_PARTNER_WORKFLOW'), 'PARTNER_SECURITY_REVIEW', 'Analyse sécurité', 2, 'RESPONSABLE_SECURITE', TRUE, TRUE, TRUE, TRUE, 'PARTENAIRE_EXTERNE'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'EXTERNAL_PARTNER_WORKFLOW'), 'PARTNER_DSN_APPROVAL', 'Décision DSN', 3, 'DIRECTEUR_DSN', TRUE, TRUE, TRUE, TRUE, 'PARTENAIRE_EXTERNE'),

    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'INTERVENTION_WORKFLOW'), 'INTERVENTION_REQUEST_REVIEW', 'Demande d''intervention', 1, 'EMPLOYE', TRUE, FALSE, TRUE, TRUE, 'TOUJOURS'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'INTERVENTION_WORKFLOW'), 'INTERVENTION_ASSIGNMENT', 'Affectation', 2, 'RESPONSABLE_SALLE', TRUE, TRUE, TRUE, TRUE, 'INTERVENTION_CRITIQUE'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'INTERVENTION_WORKFLOW'), 'INTERVENTION_CLOSURE', 'Clôture', 3, 'RESPONSABLE_SALLE', TRUE, TRUE, TRUE, FALSE, 'TOUJOURS'),

    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'GED_DOCUMENT_WORKFLOW'), 'GED_DRAFT_REVIEW', 'Soumission document', 1, 'EMPLOYE', TRUE, FALSE, TRUE, TRUE, 'TOUJOURS'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'GED_DOCUMENT_WORKFLOW'), 'GED_QUALITY_REVIEW', 'Contrôle qualité', 2, 'RESPONSABLE_QUALITE', TRUE, TRUE, TRUE, TRUE, 'DOCUMENT_CONFIDENTIEL'),
    ((SELECT id FROM workflow_definitions WHERE workflow_type = 'GED_DOCUMENT_WORKFLOW'), 'GED_PUBLICATION', 'Publication GED', 3, 'RESPONSABLE_QUALITE', TRUE, FALSE, TRUE, FALSE, 'TOUJOURS')
ON CONFLICT (workflow_id, step_code) DO NOTHING;

INSERT INTO workflow_step_actions (step_id, action_type)
SELECT ws.id, action_type
FROM workflow_steps ws
JOIN (
    VALUES
        ('EVENT_DRAFT_REVIEW', 'SUBMIT'),
        ('EVENT_DRAFT_REVIEW', 'REQUEST_CHANGES'),
        ('EVENT_SECURITY_REVIEW', 'VALIDATE'),
        ('EVENT_SECURITY_REVIEW', 'REJECT'),
        ('EVENT_DSN_APPROVAL', 'APPROVE'),
        ('EVENT_DSN_APPROVAL', 'REJECT'),
        ('EVENT_PUBLICATION', 'PUBLISH'),
        ('EVENT_PUBLICATION', 'ARCHIVE'),

        ('ROOM_REQUEST_REVIEW', 'SUBMIT'),
        ('ROOM_REQUEST_REVIEW', 'CANCEL'),
        ('ROOM_SECURITY_REVIEW', 'VALIDATE'),
        ('ROOM_SECURITY_REVIEW', 'REJECT'),
        ('ROOM_CONFIRMATION', 'APPROVE'),
        ('ROOM_CONFIRMATION', 'REJECT'),

        ('EQUIPMENT_REQUEST_REVIEW', 'SUBMIT'),
        ('EQUIPMENT_REQUEST_REVIEW', 'CANCEL'),
        ('EQUIPMENT_SECURITY_REVIEW', 'VALIDATE'),
        ('EQUIPMENT_SECURITY_REVIEW', 'REJECT'),
        ('EQUIPMENT_CONFIRMATION', 'APPROVE'),
        ('EQUIPMENT_CONFIRMATION', 'REJECT'),

        ('PARTNER_REQUEST_REVIEW', 'SUBMIT'),
        ('PARTNER_REQUEST_REVIEW', 'CANCEL'),
        ('PARTNER_SECURITY_REVIEW', 'VALIDATE'),
        ('PARTNER_SECURITY_REVIEW', 'REJECT'),
        ('PARTNER_DSN_APPROVAL', 'APPROVE'),
        ('PARTNER_DSN_APPROVAL', 'REJECT'),

        ('INTERVENTION_REQUEST_REVIEW', 'SUBMIT'),
        ('INTERVENTION_REQUEST_REVIEW', 'CANCEL'),
        ('INTERVENTION_ASSIGNMENT', 'ASSIGN'),
        ('INTERVENTION_ASSIGNMENT', 'REJECT'),
        ('INTERVENTION_CLOSURE', 'CLOSE'),
        ('INTERVENTION_CLOSURE', 'REJECT'),

        ('GED_DRAFT_REVIEW', 'SUBMIT'),
        ('GED_DRAFT_REVIEW', 'REQUEST_CHANGES'),
        ('GED_QUALITY_REVIEW', 'VALIDATE'),
        ('GED_QUALITY_REVIEW', 'REJECT'),
        ('GED_PUBLICATION', 'PUBLISH'),
        ('GED_PUBLICATION', 'ARCHIVE')
) AS action_map(step_code, action_type)
    ON ws.step_code = action_map.step_code
ON CONFLICT DO NOTHING;
