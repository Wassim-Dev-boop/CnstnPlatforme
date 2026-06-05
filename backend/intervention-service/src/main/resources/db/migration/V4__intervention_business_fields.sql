-- V4: Persist business fields used by the Angular intervention screen.

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS intervention_type VARCHAR(40),
ADD COLUMN IF NOT EXISTS priority VARCHAR(20),
ADD COLUMN IF NOT EXISTS location VARCHAR(200),
ADD COLUMN IF NOT EXISTS resolution VARCHAR(2000),
ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

UPDATE interventions
SET intervention_type = COALESCE(intervention_type, 'SUPPORT'),
    priority = COALESCE(priority, 'MEDIUM')
WHERE intervention_type IS NULL
   OR priority IS NULL;
