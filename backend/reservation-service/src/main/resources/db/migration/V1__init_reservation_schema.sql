CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(120) NOT NULL,
    capacity INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS equipments (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(400),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY,
    event_id UUID,
    event_mode VARCHAR(20),
    room_id UUID,
    equipment_id UUID,
    requester_username VARCHAR(120) NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    purpose VARCHAR(500),
    status VARCHAR(20) NOT NULL,
    security_conflict BOOLEAN NOT NULL DEFAULT FALSE,
    security_checked_by VARCHAR(120),
    security_checked_at TIMESTAMPTZ,
    security_decision_comment VARCHAR(500),
    rejection_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS event_mode VARCHAR(20);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS security_checked_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS security_decision_comment VARCHAR(500);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);

UPDATE reservations
SET event_id = '00000000-0000-0000-0000-000000000000'
WHERE event_id IS NULL;

UPDATE reservations
SET event_mode = 'PRESENTIEL'
WHERE event_mode IS NULL OR TRIM(event_mode) = '';

ALTER TABLE reservations
    ALTER COLUMN event_id SET NOT NULL;

ALTER TABLE reservations
    ALTER COLUMN event_mode SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservation_room'
    ) THEN
        ALTER TABLE reservations
            ADD CONSTRAINT fk_reservation_room
                FOREIGN KEY (room_id) REFERENCES rooms(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservation_equipment'
    ) THEN
        ALTER TABLE reservations
            ADD CONSTRAINT fk_reservation_equipment
                FOREIGN KEY (equipment_id) REFERENCES equipments(id);
    END IF;
END $$;

UPDATE reservations
SET equipment_id = NULL
WHERE room_id IS NOT NULL
  AND equipment_id IS NOT NULL;

DELETE FROM reservations
WHERE room_id IS NULL
  AND equipment_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_resource_xor'
    ) THEN
        ALTER TABLE reservations
            ADD CONSTRAINT chk_reservation_resource_xor
                CHECK (
                    (room_id IS NOT NULL AND equipment_id IS NULL)
                        OR (room_id IS NULL AND equipment_id IS NOT NULL)
                );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservation_event_id ON reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_reservation_room_window ON reservations(room_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_reservation_equipment_window ON reservations(equipment_id, start_at, end_at);
