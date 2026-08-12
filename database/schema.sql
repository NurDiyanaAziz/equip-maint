-- ============================================================================
-- EQUIP-MAINT: Shop Floor Equipment Maintenance & Defect Tracker
-- PostgreSQL DDL Schema (Supabase-compatible)
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: users
-- Stores plant personnel with role-based access control (RBAC).
-- Roles: 'PLANT_OPERATOR', 'MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER'
-- ============================================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150)        NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT                NOT NULL,
    role            VARCHAR(50)         NOT NULL
        CHECK (role IN ('PLANT_OPERATOR', 'MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER', 'SYSTEM_ADMIN')),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: equipment
-- Registered plant machinery with real-time status tracking.
-- Status: 'OPERATIONAL', 'MAINTENANCE', 'DOWN'
-- ============================================================================
CREATE TABLE equipment (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_code      VARCHAR(50)  UNIQUE NOT NULL,
    machine_name      VARCHAR(255)        NOT NULL,
    category          VARCHAR(100),
    serial_number     VARCHAR(100),
    location_zone     VARCHAR(100)        NOT NULL,
    installation_date DATE,
    status            VARCHAR(30)         NOT NULL DEFAULT 'OPERATIONAL'
        CHECK (status IN ('OPERATIONAL', 'MAINTENANCE', 'DOWN', 'DECOMMISSIONED')),
    created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: maintenance_tickets
-- Defect reports logged against equipment, tracking the full repair lifecycle.
-- Priority: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
-- Ticket Status: 'OPEN', 'IN_PROGRESS', 'RESOLVED'
-- ============================================================================
CREATE TABLE maintenance_tickets (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id            UUID        NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    reported_by_user_id     UUID        NOT NULL REFERENCES users(id)     ON DELETE SET NULL,
    assigned_technician_id  UUID                 REFERENCES users(id)     ON DELETE SET NULL,
    priority                VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    issue_description       TEXT        NOT NULL,
    ticket_status           VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (ticket_status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at             TIMESTAMPTZ,
    downtime_hours          NUMERIC(8, 2)
);

-- ============================================================================
-- TABLE: preventive_schedules
-- Scheduled preventive maintenance tasks per equipment.
-- ============================================================================
CREATE TABLE preventive_schedules (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id            UUID        NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    task_name               VARCHAR(255) NOT NULL,
    frequency_days          INTEGER      NOT NULL CHECK (frequency_days > 0),
    last_serviced_date      DATE         NOT NULL,
    next_service_due        DATE         NOT NULL,
    assigned_technician_id  UUID                 REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for performance optimisation on frequently filtered columns
-- ============================================================================
CREATE INDEX idx_equipment_machine_code  ON equipment (machine_code);
CREATE INDEX idx_equipment_status         ON equipment (status);
CREATE INDEX idx_equipment_location_zone  ON equipment (location_zone);
CREATE INDEX idx_equipment_category       ON equipment (category);
CREATE INDEX idx_equipment_serial_number  ON equipment (serial_number);

CREATE INDEX idx_tickets_equipment_id   ON maintenance_tickets (equipment_id);
CREATE INDEX idx_tickets_priority       ON maintenance_tickets (priority);
CREATE INDEX idx_tickets_ticket_status  ON maintenance_tickets (ticket_status);
CREATE INDEX idx_tickets_created_at     ON maintenance_tickets (created_at);

CREATE INDEX idx_preventive_next_due    ON preventive_schedules (next_service_due);
CREATE INDEX idx_preventive_equip_id    ON preventive_schedules (equipment_id);

-- ============================================================================
-- SEED DATA: Sample records for demonstration and testing
-- ============================================================================

-- Sample Users (password_hash is a bcrypt hash of 'password123')
INSERT INTO users (id, name, email, password_hash, role) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Diyana Aziz',   'diyana@plant.com',   '$2b$10$dummyhashfordemo1', 'PLANT_MANAGER'),
    ('a0000000-0000-0000-0000-000000000002', 'Ahmad Faizal',  'ahmad@plant.com',    '$2b$10$dummyhashfordemo2', 'MAINTENANCE_TECHNICIAN'),
    ('a0000000-0000-0000-0000-000000000003', 'Siti Nurhaliza', 'siti@plant.com',    '$2b$10$dummyhashfordemo3', 'MAINTENANCE_TECHNICIAN'),
    ('a0000000-0000-0000-0000-000000000004', 'Raj Kumar',     'raj@plant.com',      '$2b$10$dummyhashfordemo4', 'PLANT_OPERATOR'),
    ('a0000000-0000-0000-0000-000000000005', 'Tech Team B',   'techb@plant.com',    '$2b$10$dummyhashfordemo5', 'MAINTENANCE_TECHNICIAN');

-- Sample Equipment
INSERT INTO equipment (id, machine_code, machine_name, category, serial_number, location_zone, installation_date, status) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'CNC-001', 'CNC Milling Machine A1',    'CNC Machining',        'SN-CNC-2024-001', 'Zone-1 Machining',   '2024-01-15', 'OPERATIONAL'),
    ('b0000000-0000-0000-0000-000000000002', 'CNC-002', 'CNC Lathe B2',              'CNC Machining',        'SN-CNC-2024-002', 'Zone-1 Machining',   '2024-02-20', 'OPERATIONAL'),
    ('b0000000-0000-0000-0000-000000000003', 'ROB-001', 'Robot Welder RW-01',        'Robotics & Welding',   'SN-ROB-2024-001', 'Zone-2 Assembly',    '2024-03-10', 'DOWN'),
    ('b0000000-0000-0000-0000-000000000004', 'AST-001', 'Autoclave Unit 01',         'Autoclave / Curing',   'SN-AST-2024-001', 'Zone-3 Finishing',   '2024-04-05', 'OPERATIONAL'),
    ('b0000000-0000-0000-0000-000000000005', 'AST-002', 'Autoclave Unit 02',         'Autoclave / Curing',   'SN-AST-2024-002', 'Zone-3 Finishing',   '2024-04-05', 'DOWN'),
    ('b0000000-0000-0000-0000-000000000006', 'CNV-001', 'Conveyor Belt Main Line',   'Conveyor Systems',     'SN-CNV-2024-001', 'Zone-4 Packaging',   '2024-05-12', 'MAINTENANCE'),
    ('b0000000-0000-0000-0000-000000000007', 'PMP-001', 'Hydraulic Press HP-01',     'Hydraulic Presses',    'SN-PMP-2024-001', 'Zone-1 Machining',   '2024-01-25', 'OPERATIONAL'),
    ('b0000000-0000-0000-0000-000000000008', 'QC-001',  'Quality Control Scanner',   'Quality Inspection',   'SN-QC-2024-001',  'Zone-4 Packaging',   '2024-06-01', 'OPERATIONAL');

-- Sample Maintenance Tickets
INSERT INTO maintenance_tickets (id, equipment_id, reported_by_user_id, assigned_technician_id, priority, issue_description, ticket_status, created_at, resolved_at, downtime_hours) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'HIGH',
     'Welding arm misalignment causing inconsistent bond quality on chassis frames.', 'IN_PROGRESS', '2026-08-05 08:30:00+08', NULL, NULL),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'CRITICAL',
     'Pressure valve fails to maintain 2.5 bar during curing cycle. Risk of product batch rejection.', 'OPEN', '2026-08-07 06:15:00+08', NULL, NULL),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'MEDIUM',
     'Conveyor belt slipping at high speed. Minor tracking misalignment observed.', 'IN_PROGRESS', '2026-08-06 14:00:00+08', NULL, NULL),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'LOW',
     'Coolant pump making intermittent noise. No impact on production quality yet.', 'OPEN', '2026-08-07 09:00:00+08', NULL, NULL);
