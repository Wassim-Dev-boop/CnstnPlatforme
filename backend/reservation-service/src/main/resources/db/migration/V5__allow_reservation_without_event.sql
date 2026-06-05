-- Allow room/equipment reservations without an explicit linked event.
UPDATE reservations
SET event_id = NULL
WHERE event_id = '00000000-0000-0000-0000-000000000000';

ALTER TABLE reservations
    ALTER COLUMN event_id DROP NOT NULL;
