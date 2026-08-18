-- 140: concepten zonder nummer mogen naast elkaar bestaan
--
-- Sinds de concept-nummering (migratie/commit 71be57c5) krijgt een nieuw
-- concept pas bij "Verwerken" een definitief nummer; tot die tijd is
-- facturen.nummer een lege string (''). De bestaande unieke constraint
-- facturen_org_nummer_unique (organisatie_id, nummer) zag twee lege strings
-- echter als duplicaat, waardoor het TWEEDE concept per organisatie faalde met
-- "duplicate key value violates unique constraint" (SQLSTATE 23505) en niet
-- kon worden opgeslagen.
--
-- Oplossing: vervang de blanket-constraint door een PARTIELE unieke index die
-- alleen geldt voor niet-lege nummers. Zo blijven echte factuurnummers uniek
-- per organisatie, terwijl er onbeperkt concepten (nummer = '') naast elkaar
-- mogen bestaan.
--
-- Antony draait deze handmatig in de Supabase SQL Editor.

ALTER TABLE facturen DROP CONSTRAINT IF EXISTS facturen_org_nummer_unique;

CREATE UNIQUE INDEX IF NOT EXISTS facturen_org_nummer_unique
  ON facturen (organisatie_id, nummer)
  WHERE nummer <> '';
