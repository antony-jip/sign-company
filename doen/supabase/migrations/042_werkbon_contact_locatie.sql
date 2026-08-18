-- ============================================================
-- 042_werkbon_contact_locatie.sql
-- Contactpersoon op locatie toevoegen aan werkbonnen
-- ============================================================

ALTER TABLE werkbonnen
  ADD COLUMN IF NOT EXISTS contact_naam TEXT;

ALTER TABLE werkbonnen
  ADD COLUMN IF NOT EXISTS contact_telefoon TEXT;
