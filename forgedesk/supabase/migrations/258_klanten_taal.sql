-- Taal van de klant voor het portaal en de klantmails: Vlaanderen leest
-- Nederlands, Brussel en Wallonië Frans. Alleen de klantkant wisselt van taal;
-- de app zelf blijft Nederlands.

BEGIN;

ALTER TABLE klanten ADD COLUMN IF NOT EXISTS taal TEXT NOT NULL DEFAULT 'nl';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'klanten_taal_check') THEN
    ALTER TABLE klanten ADD CONSTRAINT klanten_taal_check CHECK (taal IN ('nl', 'fr'));
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('258_klanten_taal.sql') ON CONFLICT DO NOTHING;
