-- Migration: Add 'te-plannen' status to montage_afspraken table
-- A montage with this status has no fixed date yet ("nog te plannen") and is
-- managed from the project cockpit until it gets a date.

ALTER TABLE montage_afspraken DROP CONSTRAINT IF EXISTS montage_afspraken_status_check;
ALTER TABLE montage_afspraken ADD CONSTRAINT montage_afspraken_status_check
  CHECK (status IN ('te-plannen', 'gepland', 'onderweg', 'bezig', 'afgerond', 'uitgesteld'));
