ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS description VARCHAR(400);

ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);

UPDATE rooms
SET status = CASE
    WHEN active = FALSE THEN 'INACTIVE'
    ELSE 'DISPONIBLE'
END
WHERE status IS NULL OR TRIM(status) = '';

ALTER TABLE rooms
    ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_room_status_allowed'
    ) THEN
        ALTER TABLE rooms
            ADD CONSTRAINT chk_room_status_allowed
                CHECK (status IN ('DISPONIBLE', 'OCCUPEE', 'MAINTENANCE', 'INACTIVE'));
    END IF;
END $$;

ALTER TABLE equipments
    ADD COLUMN IF NOT EXISTS type VARCHAR(80);

UPDATE equipments
SET type = 'Materiel general'
WHERE type IS NULL OR TRIM(type) = '';

ALTER TABLE equipments
    ALTER COLUMN type SET NOT NULL;

ALTER TABLE equipments
    ADD COLUMN IF NOT EXISTS location VARCHAR(120);

ALTER TABLE equipments
    ADD COLUMN IF NOT EXISTS total_quantity INTEGER;

UPDATE equipments
SET total_quantity = 1
WHERE total_quantity IS NULL OR total_quantity < 1;

ALTER TABLE equipments
    ALTER COLUMN total_quantity SET NOT NULL;

ALTER TABLE equipments
    ADD COLUMN IF NOT EXISTS available_quantity INTEGER;

UPDATE equipments
SET available_quantity = LEAST(total_quantity, 1)
WHERE available_quantity IS NULL OR available_quantity < 0;

ALTER TABLE equipments
    ALTER COLUMN available_quantity SET NOT NULL;

ALTER TABLE equipments
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);

UPDATE equipments
SET status = CASE
    WHEN active = FALSE THEN 'INACTIVE'
    ELSE 'DISPONIBLE'
END
WHERE status IS NULL OR TRIM(status) = '';

ALTER TABLE equipments
    ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_equipment_status_allowed'
    ) THEN
        ALTER TABLE equipments
            ADD CONSTRAINT chk_equipment_status_allowed
                CHECK (status IN ('DISPONIBLE', 'OCCUPE', 'MAINTENANCE', 'INACTIVE'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_equipment_quantities'
    ) THEN
        ALTER TABLE equipments
            ADD CONSTRAINT chk_equipment_quantities
                CHECK (total_quantity > 0 AND available_quantity >= 0 AND available_quantity <= total_quantity);
    END IF;
END $$;

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS quantity_requested INTEGER;

UPDATE reservations
SET quantity_requested = 1
WHERE quantity_requested IS NULL OR quantity_requested < 1;

ALTER TABLE reservations
    ALTER COLUMN quantity_requested SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_quantity_requested'
    ) THEN
        ALTER TABLE reservations
            ADD CONSTRAINT chk_reservation_quantity_requested
                CHECK (quantity_requested > 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservation_equipment_quantity_window
    ON reservations(equipment_id, start_at, end_at, quantity_requested);
