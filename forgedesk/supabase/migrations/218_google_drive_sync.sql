-- 218: Projectbestanden doorzetten naar de klantmap in Google Drive
--
-- Het archief van het bedrijf staat in een gedeelde schijf met per klant een
-- map. Alles wat in doen. onder een project belandt hoort daar ook te staan,
-- zonder dat iemand het handmatig sleept.
--
-- Waarom een wachtrij en geen directe aanroep vanuit de client: de insert van
-- een document gebeurt in de browser, en een upload naar Drive die aan dat
-- tabblad hangt is weg zodra iemand het venster sluit. De trigger hieronder
-- schrijft puur in de database (geen netwerk, kan dus niet falen), en
-- src/trigger/drive-sync.ts pakt de rij daarna op. Mislukt de upload, dan
-- blijft de rij staan en gaat hij de volgende ronde opnieuw mee.
--
-- Waar de mappen heen gaan wordt onthouden op klant en project, zodat er per
-- bestand niet opnieuw in Drive gezocht hoeft te worden.

BEGIN;

-- ── Onthouden welke Drive-map bij welke klant en welk project hoort ──
ALTER TABLE klanten
  ADD COLUMN IF NOT EXISTS drive_map_id text;
ALTER TABLE projecten
  ADD COLUMN IF NOT EXISTS drive_map_id text;

COMMENT ON COLUMN klanten.drive_map_id IS
  'Google Drive folder-id van de klantmap. Eenmalig gevonden op bedrijfsnaam of aangemaakt; daarna leidend boven de naam, zodat hernoemen in Drive de koppeling niet breekt.';
COMMENT ON COLUMN projecten.drive_map_id IS
  'Google Drive folder-id van de projectsubmap binnen de klantmap.';

-- ── Per document bijhouden of hij er al staat ──
ALTER TABLE documenten
  ADD COLUMN IF NOT EXISTS drive_bestand_id text,
  ADD COLUMN IF NOT EXISTS drive_gesynct_op timestamptz;

COMMENT ON COLUMN documenten.drive_bestand_id IS
  'Google Drive file-id. Gevuld betekent: staat in de klantmap, niet opnieuw uploaden.';

-- ── Instellingen per organisatie ──
-- app_settings is de bestaande plek voor integratie-instellingen (zie
-- api/save-integration-settings.ts). De hoofdmap is de map in de gedeelde
-- schijf waaronder de klantmappen hangen.
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS drive_actief boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS drive_hoofdmap_id text,
  ADD COLUMN IF NOT EXISTS drive_map_aanmaken boolean DEFAULT true;

COMMENT ON COLUMN app_settings.drive_hoofdmap_id IS
  'Folder-id van de map in de gedeelde schijf waaronder de klantmappen staan. Leeg = geen sync.';
COMMENT ON COLUMN app_settings.drive_map_aanmaken IS
  'Mag doen. een klant- of projectmap aanmaken als hij hem niet vindt?';

-- Eén hoofdmap hoort bij één organisatie.
--
-- Alle bedrijven delen hetzelfde service-account van doen., dus dat account
-- kan bij de schijven van alle klanten tegelijk. Zonder deze grendel kan een
-- organisatie het folder-id van een ander invullen en gaan haar bestanden het
-- archief van een vreemd bedrijf in. Folder-id's zijn niet te raden, maar dat
-- is geen beveiliging — dit wel.
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_drive_hoofdmap_uniek
  ON app_settings (drive_hoofdmap_id)
  WHERE drive_hoofdmap_id IS NOT NULL AND drive_hoofdmap_id <> '';

-- ── Wachtrij ──
CREATE TABLE IF NOT EXISTS drive_sync_wachtrij (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documenten(id) ON DELETE CASCADE,
  organisatie_id uuid REFERENCES organisaties(id) ON DELETE CASCADE,
  -- overgeslagen = deze organisatie heeft Drive niet aanstaan of het document
  -- hoort nergens; die rijen blijven staan als verklaring, niet als werk.
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'klaar', 'mislukt', 'overgeslagen')),
  pogingen integer NOT NULL DEFAULT 0,
  laatste_fout text,
  volgende_poging timestamptz NOT NULL DEFAULT now(),
  drive_bestand_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Eén rij per document: een tweede trigger-inslag mag geen tweede upload geven.
CREATE UNIQUE INDEX IF NOT EXISTS drive_sync_wachtrij_document_uniek
  ON drive_sync_wachtrij (document_id);

-- De werker vraagt alleen naar openstaand werk dat aan de beurt is.
CREATE INDEX IF NOT EXISTS drive_sync_wachtrij_open_idx
  ON drive_sync_wachtrij (volgende_poging)
  WHERE status = 'open';

ALTER TABLE drive_sync_wachtrij ENABLE ROW LEVEL SECURITY;

-- Bewuste afwijking van de huisregel "elke tabel INSERT/UPDATE/DELETE
-- afdekken": deze tabel krijgt alleen een SELECT-policy.
--
-- Het is een werkvoorraad, geen gebruikersdata. Schrijven doet uitsluitend de
-- trigger hieronder (SECURITY DEFINER) en de werker (service_role, die RLS
-- overslaat). Zou een client mogen schrijven, dan kan iemand rijen op 'klaar'
-- zetten waardoor bestanden stilletjes nooit in Drive belanden, of rijen
-- aanmaken voor documenten van een ander. Lezen mag wel, zodat een scherm
-- later kan tonen wat er is blijven hangen.
CREATE POLICY "drive_sync_wachtrij_org_select" ON drive_sync_wachtrij FOR SELECT
  USING (organisatie_id = auth_organisatie_id());

-- ── Trigger: elk projectbestand komt in de wachtrij ──
CREATE OR REPLACE FUNCTION drive_sync_inplannen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Zonder project weten we niet in welke klantmap het hoort, en zonder
  -- storage_path is er niets om te uploaden.
  IF NEW.project_id IS NOT NULL
     AND NEW.storage_path IS NOT NULL
     AND NEW.storage_path <> '' THEN
    INSERT INTO drive_sync_wachtrij (document_id, organisatie_id)
    VALUES (NEW.id, NEW.organisatie_id)
    ON CONFLICT (document_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documenten_drive_sync ON documenten;
CREATE TRIGGER documenten_drive_sync
  AFTER INSERT ON documenten
  FOR EACH ROW
  EXECUTE FUNCTION drive_sync_inplannen();

COMMIT;

-- Verificatie na het draaien:
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'documenten' AND column_name LIKE 'drive%';
--   -- verwacht: drive_bestand_id, drive_gesynct_op
--
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'documenten'::regclass
--     AND NOT tgisinternal;
--   -- verwacht: documenten_drive_sync staat ertussen

-- Optioneel, pas draaien NA een geslaagde eerste sync: bestaande
-- projectbestanden alsnog in de wachtrij zetten. Doe dit per organisatie en
-- niet in één keer voor alles, anders staat er ineens een archief van jaren
-- klaar en tikt de werker daar uren op door.
--
--   INSERT INTO drive_sync_wachtrij (document_id, organisatie_id)
--   SELECT d.id, d.organisatie_id
--   FROM documenten d
--   WHERE d.organisatie_id = '<organisatie-id>'
--     AND d.project_id IS NOT NULL
--     AND d.storage_path IS NOT NULL AND d.storage_path <> ''
--     AND d.drive_bestand_id IS NULL
--   ON CONFLICT (document_id) DO NOTHING;

INSERT INTO doen_migraties (bestand) VALUES ('218_google_drive_sync.sql') ON CONFLICT DO NOTHING;
