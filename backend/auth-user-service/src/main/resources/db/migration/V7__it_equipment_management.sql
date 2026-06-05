-- V7: Add IT Equipment management tables

CREATE TABLE IF NOT EXISTS it_equipment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS it_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    serial_number VARCHAR(120) NOT NULL UNIQUE,
    category_id UUID NOT NULL,
    brand VARCHAR(120),
    model VARCHAR(120),
    state VARCHAR(32) NOT NULL DEFAULT 'OPERATIONAL',
    assignment_status VARCHAR(32) NOT NULL DEFAULT 'NOT_ASSIGNED',
    description VARCHAR(1000),
    current_employee_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_it_equipment_category FOREIGN KEY (category_id) REFERENCES it_equipment_categories(id)
);

CREATE TABLE IF NOT EXISTS it_equipment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL,
    employee_id VARCHAR(36) NOT NULL,
    employee_name VARCHAR(240),
    assigned_at TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    assigned_by VARCHAR(120),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_assignment_equipment FOREIGN KEY (equipment_id) REFERENCES it_equipment(id)
);

-- Indexes for performance
CREATE INDEX idx_it_equipment_category ON it_equipment(category_id);
CREATE INDEX idx_it_equipment_serial ON it_equipment(serial_number);
CREATE INDEX idx_it_equipment_state ON it_equipment(state);
CREATE INDEX idx_it_equipment_assignment ON it_equipment(assignment_status);
CREATE INDEX idx_assignment_equipment ON it_equipment_assignments(equipment_id);
CREATE INDEX idx_assignment_employee ON it_equipment_assignments(employee_id);
CREATE INDEX idx_assignment_status ON it_equipment_assignments(status);
