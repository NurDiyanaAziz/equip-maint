-- ============================================================================
-- EQUIP-MAINT: Migration V3 — Preventive Maintenance Module
-- Adds assigned_technician_id to preventive_schedules
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'preventive_schedules' AND column_name = 'assigned_technician_id') THEN
    ALTER TABLE preventive_schedules ADD COLUMN assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_preventive_assigned_tech ON preventive_schedules (assigned_technician_id);

COMMIT;
