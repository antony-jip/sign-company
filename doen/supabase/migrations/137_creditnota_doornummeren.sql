-- Migration 137: optie om creditnota's door te nummeren in de normale
-- factuurnummer-reeks i.p.v. een aparte CN-reeks.
--
-- Antony draait deze handmatig in de Supabase SQL Editor.
-- Default false = bestaand gedrag (eigen creditnota-prefix) blijft ongewijzigd.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS creditnota_doornummeren BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN app_settings.creditnota_doornummeren IS
  'true = creditnota krijgt een nummer uit de normale factuurreeks (factuur_prefix); false = aparte creditnota_prefix-reeks';
