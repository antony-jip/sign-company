-- 250_nieuwsbrief_afzender.sql
--
-- Afzender per nieuwsbrief: de naam die ontvangers zien en het adres waar de
-- mail vandaan komt (en waar antwoorden heen gaan).
--
-- Bewust geen CHECK op het adres. Welke adressen mogen, bewaakt de server
-- (kiesAfzender in de nieuwsbrief-api's): die lijst verandert vaker dan het
-- schema, en een onbekend adres valt daar terug op de standaardafzender.
-- NULL betekent: standaardafzender (Sign Company <antony@signcompany.nl>).
--
-- RLS: de tabel heeft al policies op user_id (migratie 149); nieuwe kolommen
-- vallen daar automatisch onder.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE nieuwsbrieven
  ADD COLUMN IF NOT EXISTS afzender_naam text,
  ADD COLUMN IF NOT EXISTS afzender_email text;

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('250_nieuwsbrief_afzender.sql') ON CONFLICT DO NOTHING;

-- Controle:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'nieuwsbrieven' AND column_name LIKE 'afzender_%';
--
-- Terugdraaien:
--   ALTER TABLE nieuwsbrieven DROP COLUMN IF EXISTS afzender_naam, DROP COLUMN IF EXISTS afzender_email;
