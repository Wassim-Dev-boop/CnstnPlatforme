-- V2: Add IT workflow support to interventions table

ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS equipment_id UUID,
ADD COLUMN IF NOT EXISTS it_workflow_status VARCHAR(64),
ADD COLUMN IF NOT EXISTS manager_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manager_approval_note VARCHAR(1000),
ADD COLUMN IF NOT EXISTS manager_id VARCHAR(120),
ADD COLUMN IF NOT EXISTS dsn_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dsn_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dsn_approval_note VARCHAR(1000),
ADD COLUMN IF NOT EXISTS dsn_id VARCHAR(120),
ADD COLUMN IF NOT EXISTS it_responsible_id VARCHAR(120),
ADD COLUMN IF NOT EXISTS it_processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_it_workflow BOOLEAN DEFAULT FALSE;

-- Create index for IT workflow queries
CREATE INDEX IF NOT EXISTS idx_interventions_is_it_workflow ON interventions(is_it_workflow);
CREATE INDEX IF NOT EXISTS idx_interventions_equipment_id ON interventions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_interventions_it_status ON interventions(it_workflow_status);
