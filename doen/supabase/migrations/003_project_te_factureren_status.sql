-- Migration: Add 'te-factureren' status to projecten table
-- This allows marking projects as ready for invoicing

-- Drop the existing check constraint and recreate with the new status value
ALTER TABLE projecten DROP CONSTRAINT IF EXISTS projecten_status_check;
ALTER TABLE projecten ADD CONSTRAINT projecten_status_check
  CHECK (status IN ('gepland', 'actief', 'in-review', 'afgerond', 'on-hold', 'te-factureren'));
