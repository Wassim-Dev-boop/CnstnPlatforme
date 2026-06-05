ALTER TABLE workflow_audit_logs
    ADD COLUMN IF NOT EXISTS comment VARCHAR(500);
