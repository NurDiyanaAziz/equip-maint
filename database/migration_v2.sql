-- ============================================================================
-- EQUIP-MAINT: Migration V2 — Equipment Registry Module Enhancements
-- Adds category, serial_number, installation_date, and DECOMMISSIONED status
-- ============================================================================

BEGIN;

-- Add new columns to equipment (safe — uses IF NOT EXISTS logic via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'equipment' AND column_name = 'category') THEN
    ALTER TABLE equipment ADD COLUMN category VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'equipment' AND column_name = 'serial_number') THEN
    ALTER TABLE equipment ADD COLUMN serial_number VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'equipment' AND column_name = 'installation_date') THEN
    ALTER TABLE equipment ADD COLUMN installation_date DATE;
  END IF;
END $$;

-- Drop the old CHECK constraint and add a new one that includes DECOMMISSIONED
-- The constraint name is auto-generated; we find it dynamically
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'equipment'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE equipment DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE equipment ADD CONSTRAINT equipment_status_check
  CHECK (status IN ('OPERATIONAL', 'MAINTENANCE', 'DOWN', 'DECOMMISSIONED'));

-- New indexes for added filter columns
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment (category);
CREATE INDEX IF NOT EXISTS idx_equipment_serial_number ON equipment (serial_number);

-- Update seed data with categories and serial numbers
UPDATE equipment SET
  category = CASE machine_code
    WHEN 'CNC-001' THEN 'CNC Machining'
    WHEN 'CNC-002' THEN 'CNC Machining'
    WHEN 'ROB-001' THEN 'Robotics & Welding'
    WHEN 'AST-001' THEN 'Autoclave / Curing'
    WHEN 'AST-002' THEN 'Autoclave / Curing'
    WHEN 'CNV-001' THEN 'Conveyor Systems'
    WHEN 'PMP-001' THEN 'Hydraulic Presses'
    WHEN 'QC-001'  THEN 'Quality Inspection'
  END,
  serial_number = CASE machine_code
    WHEN 'CNC-001' THEN 'SN-CNC-2024-001'
    WHEN 'CNC-002' THEN 'SN-CNC-2024-002'
    WHEN 'ROB-001' THEN 'SN-ROB-2024-001'
    WHEN 'AST-001' THEN 'SN-AST-2024-001'
    WHEN 'AST-002' THEN 'SN-AST-2024-002'
    WHEN 'CNV-001' THEN 'SN-CNV-2024-001'
    WHEN 'PMP-001' THEN 'SN-PMP-2024-001'
    WHEN 'QC-001'  THEN 'SN-QC-2024-001'
  END,
  installation_date = CASE machine_code
    WHEN 'CNC-001' THEN '2024-01-15'
    WHEN 'CNC-002' THEN '2024-02-20'
    WHEN 'ROB-001' THEN '2024-03-10'
    WHEN 'AST-001' THEN '2024-04-05'
    WHEN 'AST-002' THEN '2024-04-05'
    WHEN 'CNV-001' THEN '2024-05-12'
    WHEN 'PMP-001' THEN '2024-01-25'
    WHEN 'QC-001'  THEN '2024-06-01'
  END
WHERE category IS NULL;

COMMIT;
