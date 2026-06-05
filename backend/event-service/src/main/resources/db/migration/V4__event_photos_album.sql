CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    file_name VARCHAR(220) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by VARCHAR(120) NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    content BYTEA NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_photo_event'
    ) THEN
        ALTER TABLE event_photos
            ADD CONSTRAINT fk_event_photo_event
                FOREIGN KEY (event_id) REFERENCES events(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_photos_event ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_created_at ON event_photos(created_at DESC);
