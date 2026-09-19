-- Landen als ISO-code, voorbereiding op Belgische organisaties en Peppol.
--
-- klanten.land en vestigingen.land waren vrije tekst met default 'Nederland';
-- het klantformulier had geen landveld, dus in de praktijk stond er overal
-- die ene waarde. De UBL-export nam hem letterlijk over als landcode.
-- Vanaf nu: ISO 3166-1 alpha-2 ('NL', 'BE', ...). Bestaande namen worden
-- omgezet; wat we niet herkennen blijft staan en wordt door src/lib/landen.ts
-- als onbekend behandeld.
--
-- profiles.bedrijfs_land is het land van het eigen bedrijf: bepaalt de
-- btw-tarieven in de selects, het Peppol-profiel en het label van het
-- ondernemingsnummer (KvK / KBO).

BEGIN;

ALTER TABLE klanten ALTER COLUMN land SET DEFAULT 'NL';
UPDATE klanten SET land = 'NL'
  WHERE land IS NULL OR btrim(land) = ''
     OR lower(btrim(land)) IN ('nederland', 'netherlands', 'the netherlands', 'holland', 'nl');
UPDATE klanten SET land = 'BE'
  WHERE lower(btrim(land)) IN ('belgië', 'belgie', 'belgium', 'belgique', 'be');
UPDATE klanten SET land = 'DE'
  WHERE lower(btrim(land)) IN ('duitsland', 'germany', 'deutschland', 'de');

ALTER TABLE vestigingen ALTER COLUMN land SET DEFAULT 'NL';
UPDATE vestigingen SET land = 'NL'
  WHERE land IS NULL OR btrim(land) = ''
     OR lower(btrim(land)) IN ('nederland', 'netherlands', 'the netherlands', 'holland', 'nl');
UPDATE vestigingen SET land = 'BE'
  WHERE lower(btrim(land)) IN ('belgië', 'belgie', 'belgium', 'belgique', 'be');
UPDATE vestigingen SET land = 'DE'
  WHERE lower(btrim(land)) IN ('duitsland', 'germany', 'deutschland', 'de');

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bedrijfs_land TEXT NOT NULL DEFAULT 'NL';

COMMENT ON COLUMN klanten.land IS 'ISO 3166-1 alpha-2 (NL, BE, DE, ...); zie src/lib/landen.ts';
COMMENT ON COLUMN profiles.bedrijfs_land IS 'Land van het eigen bedrijf als ISO-code; stuurt btw-tarieven en Peppol-profiel';

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('252_land_iso.sql') ON CONFLICT DO NOTHING;
