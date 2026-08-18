-- Migration: Add 'gefactureerd' status to projecten table
-- Automatically set when a linked factuur is sent or paid

ALTER TABLE projecten DROP CONSTRAINT IF EXISTS projecten_status_check;
ALTER TABLE projecten ADD CONSTRAINT projecten_status_check
  CHECK (status IN ('gepland', 'actief', 'in-review', 'afgerond', 'on-hold', 'te-factureren', 'gefactureerd'));
