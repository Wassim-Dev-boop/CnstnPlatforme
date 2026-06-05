-- Official reservation documents must support reservations not linked to an event.
UPDATE reservation_official_documents
SET event_id = NULL
WHERE event_id = '00000000-0000-0000-0000-000000000000';

ALTER TABLE reservation_official_documents
    ALTER COLUMN event_id DROP NOT NULL;
