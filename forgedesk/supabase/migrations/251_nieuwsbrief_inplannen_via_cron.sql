-- 251_nieuwsbrief_inplannen_via_cron.sql
--
-- Inplannen zonder Resend-lijst. Een ingeplande brief wordt niet meer bij Resend
-- ingepland (broadcast met scheduledAt, of per mail met een maximum van 120),
-- maar vastgezet in doen. Op het moment zelf drukt api/cron-nieuwsbrief op
-- verzenden en gaat hij per mail de deur uit.
--
-- verzend_via_cron  deze brief wordt door de cron verstuurd, niet door Resend
-- cron_gestart_op   claim: de cron-run die hem nu verstuurt. Leeg = vrij. Een
--                   run die verzendt zet dit van leeg naar nu; een tweede run
--                   ziet het gevuld en blijft eraf. Ouder dan tien minuten =
--                   gestorven run, de cron geeft hem dan vrij.
-- cron_pogingen     hoe vaak de cron het geprobeerd heeft; na vier fouten gaat
--                   de brief terug naar concept
-- cron_fout         laatste fout, zichtbaar in de editor
--
-- RLS: de tabel heeft al policies op user_id (migratie 149).

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE nieuwsbrieven
  ADD COLUMN IF NOT EXISTS verzend_via_cron boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cron_gestart_op timestamptz,
  ADD COLUMN IF NOT EXISTS cron_pogingen integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cron_fout text;

-- De cron zoekt elk kwartier naar ingeplande brieven die aan de beurt zijn.
CREATE INDEX IF NOT EXISTS nieuwsbrieven_ingepland_via_cron_idx
  ON nieuwsbrieven (gepland_op)
  WHERE status = 'gepland' AND verzend_via_cron;

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('251_nieuwsbrief_inplannen_via_cron.sql') ON CONFLICT DO NOTHING;

-- Controle:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'nieuwsbrieven' AND column_name IN ('verzend_via_cron', 'cron_gestart_op', 'cron_pogingen', 'cron_fout');
--
-- Terugdraaien (alleen als er niets via de cron ingepland staat):
--   DROP INDEX IF EXISTS nieuwsbrieven_ingepland_via_cron_idx;
--   ALTER TABLE nieuwsbrieven DROP COLUMN IF EXISTS verzend_via_cron, DROP COLUMN IF EXISTS cron_gestart_op,
--     DROP COLUMN IF EXISTS cron_pogingen, DROP COLUMN IF EXISTS cron_fout;
