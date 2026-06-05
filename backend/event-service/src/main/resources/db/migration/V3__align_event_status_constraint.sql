UPDATE events
SET status = 'DRAFT'
WHERE status IS NULL OR TRIM(status) = '';

UPDATE events
SET status = 'PENDING'
WHERE status = 'SUBMITTED';

UPDATE events
SET status = 'APPROVED'
WHERE status IN ('PUBLISHED', 'COMPLETED');

UPDATE events
SET status = 'REJECTED'
WHERE status = 'CANCELLED';

ALTER TABLE events
    DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
    ADD CONSTRAINT events_status_check
        CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED'));
