CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(2000),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    location VARCHAR(150),
    event_type VARCHAR(30),
    event_mode VARCHAR(20),
    online_event BOOLEAN NOT NULL DEFAULT FALSE,
    zoom_meeting_number VARCHAR(30),
    zoom_passcode VARCHAR(100),
    online_meeting_provider VARCHAR(60),
    online_meeting_link VARCHAR(500),
    online_meeting_id VARCHAR(80),
    online_meeting_password VARCHAR(120),
    requested_by VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    workflow_step VARCHAR(40),
    business_version INTEGER,
    has_external_partners BOOLEAN,
    submitted_by VARCHAR(120),
    submitted_at TIMESTAMPTZ,
    manager_decision_comment VARCHAR(500),
    manager_decision_by VARCHAR(120),
    manager_decision_at TIMESTAMPTZ,
    security_decision_comment VARCHAR(500),
    security_decision_by VARCHAR(120),
    security_decision_at TIMESTAMPTZ,
    dsn_decision_comment VARCHAR(500),
    dsn_decision_by VARCHAR(120),
    dsn_decision_at TIMESTAMPTZ,
    decision_comment VARCHAR(500),
    decided_by VARCHAR(120),
    rejection_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_invitations (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    partner_name VARCHAR(150) NOT NULL,
    partner_email VARCHAR(190) NOT NULL,
    access_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(30);
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_mode VARCHAR(20);
ALTER TABLE events ADD COLUMN IF NOT EXISTS online_meeting_provider VARCHAR(60);
ALTER TABLE events ADD COLUMN IF NOT EXISTS online_meeting_link VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS online_meeting_id VARCHAR(80);
ALTER TABLE events ADD COLUMN IF NOT EXISTS online_meeting_password VARCHAR(120);
ALTER TABLE events ADD COLUMN IF NOT EXISTS workflow_step VARCHAR(40);
ALTER TABLE events ADD COLUMN IF NOT EXISTS business_version INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS has_external_partners BOOLEAN;
ALTER TABLE events ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(120);
ALTER TABLE events ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS manager_decision_comment VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS manager_decision_by VARCHAR(120);
ALTER TABLE events ADD COLUMN IF NOT EXISTS manager_decision_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS security_decision_comment VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS security_decision_by VARCHAR(120);
ALTER TABLE events ADD COLUMN IF NOT EXISTS security_decision_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS dsn_decision_comment VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS dsn_decision_by VARCHAR(120);
ALTER TABLE events ADD COLUMN IF NOT EXISTS dsn_decision_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);

UPDATE events
SET event_type = 'REUNION'
WHERE event_type IS NULL OR TRIM(event_type) = '';

UPDATE events
SET event_mode = CASE
    WHEN online_event IS TRUE THEN 'EN_LIGNE'
    ELSE 'PRESENTIEL'
END
WHERE event_mode IS NULL OR TRIM(event_mode) = '';

UPDATE events
SET status = 'DRAFT'
WHERE status IS NULL OR TRIM(status) = '';

UPDATE events
SET business_version = 1
WHERE business_version IS NULL OR business_version < 1;

UPDATE events
SET has_external_partners = FALSE
WHERE has_external_partners IS NULL;

UPDATE events
SET workflow_step = CASE
    WHEN status = 'APPROVED' THEN 'TERMINE'
    WHEN status = 'REJECTED' THEN 'REFUSE'
    WHEN status = 'PENDING' THEN 'VALIDATION_MANAGER'
    ELSE 'BROUILLON'
END
WHERE workflow_step IS NULL OR TRIM(workflow_step) = '';

UPDATE events e
SET has_external_partners = EXISTS (
    SELECT 1
    FROM partner_invitations p
    WHERE p.event_id = e.id
);

ALTER TABLE events ALTER COLUMN event_type SET NOT NULL;
ALTER TABLE events ALTER COLUMN event_mode SET NOT NULL;
ALTER TABLE events ALTER COLUMN status SET NOT NULL;
ALTER TABLE events ALTER COLUMN workflow_step SET NOT NULL;
ALTER TABLE events ALTER COLUMN business_version SET NOT NULL;
ALTER TABLE events ALTER COLUMN has_external_partners SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_partner_invitation_event'
    ) THEN
        ALTER TABLE partner_invitations
            ADD CONSTRAINT fk_partner_invitation_event
                FOREIGN KEY (event_id) REFERENCES events(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_workflow_step ON events(workflow_step);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_requested_by ON events(requested_by);
CREATE INDEX IF NOT EXISTS idx_partner_invitation_event ON partner_invitations(event_id);
