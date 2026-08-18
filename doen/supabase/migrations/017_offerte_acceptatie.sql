-- Offerte klant acceptatie kolommen
ALTER TABLE offertes
  ADD COLUMN IF NOT EXISTS geaccepteerd_door text,
  ADD COLUMN IF NOT EXISTS geaccepteerd_op timestamp with time zone,
  ADD COLUMN IF NOT EXISTS wijziging_opmerking text,
  ADD COLUMN IF NOT EXISTS wijziging_ingediend_op timestamp with time zone,
  ADD COLUMN IF NOT EXISTS publieke_link_geopend_op timestamp with time zone,
  ADD COLUMN IF NOT EXISTS publieke_link_views integer DEFAULT 0;
