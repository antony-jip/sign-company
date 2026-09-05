-- Klanten, Gripp-ronde september 2026.
--
-- gepinde_notitie bestond al; het vinkje maakt hem een waarschuwing die
-- opduikt op offerte, project, werkbon, bestelbon en inkoopfactuur.
-- verzendvoorkeur, btw_verlegd en po_verplicht zijn de standaardwaarden per
-- klant die Gripp op het tabblad Financieel heeft. labels bestond in de types
-- maar niet overal in de database; hier voor de zekerheid idempotent erbij.

BEGIN;

ALTER TABLE klanten ADD COLUMN IF NOT EXISTS gepinde_notitie_waarschuwing BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS verzendvoorkeur TEXT CHECK (verzendvoorkeur IS NULL OR verzendvoorkeur IN ('email','post','portaal'));
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS btw_verlegd BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS po_verplicht BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS labels TEXT[] NOT NULL DEFAULT '{}';

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('236_klanten_gripp_ronde.sql') ON CONFLICT DO NOTHING;
