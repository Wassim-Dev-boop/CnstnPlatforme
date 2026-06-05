ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_room_id VARCHAR(120);

UPDATE events
SET meeting_room_id = 'EVT-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE event_mode IN ('EN_LIGNE', 'HYBRIDE')
  AND (meeting_room_id IS NULL OR TRIM(meeting_room_id) = '');

UPDATE events
SET meeting_room_id = NULL
WHERE event_mode = 'PRESENTIEL';
