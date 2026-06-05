CREATE TABLE IF NOT EXISTS event_invitations (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    invited_username VARCHAR(120) NOT NULL,
    invited_email VARCHAR(190) NOT NULL,
    invited_display_name VARCHAR(150) NOT NULL,
    invited_by_username VARCHAR(120) NOT NULL,
    invited_by_display_name VARCHAR(150) NOT NULL,
    message VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    response_reason VARCHAR(500),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_invitation_event'
    ) THEN
        ALTER TABLE event_invitations
            ADD CONSTRAINT fk_event_invitation_event
                FOREIGN KEY (event_id) REFERENCES events(id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_event_invitation_event_user
    ON event_invitations(event_id, invited_username);
CREATE INDEX IF NOT EXISTS idx_event_invitation_event
    ON event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitation_user
    ON event_invitations(invited_username);
CREATE INDEX IF NOT EXISTS idx_event_invitation_status_expiry
    ON event_invitations(status, expires_at);

