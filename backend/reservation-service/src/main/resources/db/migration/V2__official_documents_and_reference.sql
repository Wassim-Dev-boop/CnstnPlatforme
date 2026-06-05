ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS reference_code VARCHAR(20);

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS business_version INTEGER;

UPDATE reservations
SET business_version = 1
WHERE business_version IS NULL OR business_version < 1;

WITH ranked AS (
    SELECT
        id,
        EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::INT AS ref_year,
        ROW_NUMBER() OVER (
            PARTITION BY EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::INT
            ORDER BY created_at NULLS LAST, id
        ) AS seq
    FROM reservations
    WHERE reference_code IS NULL OR TRIM(reference_code) = ''
)
UPDATE reservations r
SET reference_code = 'RES-' || ranked.ref_year || '-' || LPAD(ranked.seq::TEXT, 4, '0')
FROM ranked
WHERE r.id = ranked.id;

ALTER TABLE reservations
    ALTER COLUMN business_version SET NOT NULL;

ALTER TABLE reservations
    ALTER COLUMN reference_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_reservations_reference_code ON reservations(reference_code);

CREATE TABLE IF NOT EXISTS reservation_reference_counters (
    id UUID PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL,
    year_value INTEGER NOT NULL,
    last_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_reservation_reference_counter_prefix_year'
    ) THEN
        ALTER TABLE reservation_reference_counters
            ADD CONSTRAINT uk_reservation_reference_counter_prefix_year UNIQUE (prefix, year_value);
    END IF;
END $$;

INSERT INTO reservation_reference_counters (id, prefix, year_value, last_value, created_at, updated_at)
SELECT
    (
        SUBSTRING(md5('RES-' || parsed.ref_year::TEXT), 1, 8)
            || '-'
            || SUBSTRING(md5('RES-' || parsed.ref_year::TEXT), 9, 4)
            || '-'
            || SUBSTRING(md5('RES-' || parsed.ref_year::TEXT), 13, 4)
            || '-'
            || SUBSTRING(md5('RES-' || parsed.ref_year::TEXT), 17, 4)
            || '-'
            || SUBSTRING(md5('RES-' || parsed.ref_year::TEXT), 21, 12)
    )::UUID,
    'RES',
    parsed.ref_year,
    MAX(parsed.ref_seq),
    NOW(),
    NOW()
FROM (
    SELECT
        (regexp_match(reference_code, '^RES-(\d{4})-(\d{4})$'))[1]::INT AS ref_year,
        (regexp_match(reference_code, '^RES-(\d{4})-(\d{4})$'))[2]::INT AS ref_seq
    FROM reservations
    WHERE reference_code ~ '^RES-\d{4}-\d{4}$'
) parsed
GROUP BY parsed.ref_year
ON CONFLICT (prefix, year_value)
DO UPDATE SET last_value = GREATEST(reservation_reference_counters.last_value, EXCLUDED.last_value),
              updated_at = NOW();

CREATE TABLE IF NOT EXISTS reservation_official_documents (
    id UUID PRIMARY KEY,
    reservation_id UUID NOT NULL,
    event_id UUID NOT NULL,
    document_type VARCHAR(60) NOT NULL,
    document_reference VARCHAR(60) NOT NULL,
    business_version INTEGER NOT NULL,
    file_name VARCHAR(220) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    generated_by VARCHAR(120) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    decision_role VARCHAR(80),
    decision_name VARCHAR(120),
    decision_at TIMESTAMPTZ,
    decision_value VARCHAR(20),
    decision_comment VARCHAR(500),
    rejection_reason VARCHAR(500),
    content BYTEA NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservation_document_reservation'
    ) THEN
        ALTER TABLE reservation_official_documents
            ADD CONSTRAINT fk_reservation_document_reservation
                FOREIGN KEY (reservation_id) REFERENCES reservations(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_reservation_document_reference'
    ) THEN
        ALTER TABLE reservation_official_documents
            ADD CONSTRAINT uk_reservation_document_reference UNIQUE (document_reference);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservation_document_reservation ON reservation_official_documents(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_document_event ON reservation_official_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_reservation_document_generated_at ON reservation_official_documents(generated_at DESC);
