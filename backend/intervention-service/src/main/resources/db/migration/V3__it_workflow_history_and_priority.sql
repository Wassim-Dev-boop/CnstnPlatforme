-- V3: IT workflow history + priority + diagnostic fields

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS it_priority VARCHAR(32),
ADD COLUMN IF NOT EXISTS it_diagnostic_comment VARCHAR(2000);

CREATE TABLE IF NOT EXISTS it_intervention_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL,
    from_status VARCHAR(64),
    to_status VARCHAR(64) NOT NULL,
    actor_id VARCHAR(120) NOT NULL,
    actor_role VARCHAR(120),
    note VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_it_transition_intervention
        FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_it_transition_intervention ON it_intervention_transitions(intervention_id);
CREATE INDEX IF NOT EXISTS idx_it_transition_created_at ON it_intervention_transitions(created_at);
