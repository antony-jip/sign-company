-- Weekstaat, uren goedkeuren en contracturen (septemberronde 2026, deel 2).
--
-- 1. Status op de urenregel: concept, definitief (week ingediend), goedgekeurd.
--    Default 'goedgekeurd' zodat bestaande rijen en organisaties zonder
--    goedkeuren (schakelaar uren_goedkeuren uit) niets merken. Staat de
--    schakelaar aan, dan schrijft de app 'concept' en gaat alleen
--    'goedgekeurd' naar de factuur.
-- 2. Contracturen per medewerker per weekdag. medewerker_id is TEXT, net als
--    planning_afwezigheid: het kan een medewerkers.id zijn of 'profile-<uuid>'
--    voor een teamlid zonder medewerker-record.

BEGIN;

ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'goedgekeurd'
  CHECK (status IN ('concept', 'definitief', 'goedgekeurd'));
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS definitief_op TIMESTAMPTZ;
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS goedgekeurd_door_id UUID;
ALTER TABLE tijdregistraties ADD COLUMN IF NOT EXISTS goedgekeurd_op TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_org_status_datum
  ON tijdregistraties (organisatie_id, status, datum);
CREATE INDEX IF NOT EXISTS idx_tijdregistraties_medewerker_datum
  ON tijdregistraties (medewerker_id, datum);

CREATE TABLE IF NOT EXISTS medewerker_contracten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  medewerker_id TEXT NOT NULL,
  geldig_van DATE NOT NULL DEFAULT CURRENT_DATE,
  geldig_tot DATE,
  uren_ma NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_di NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_wo NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_do NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_vr NUMERIC(4,2) NOT NULL DEFAULT 8,
  uren_za NUMERIC(4,2) NOT NULL DEFAULT 0,
  uren_zo NUMERIC(4,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (geldig_tot IS NULL OR geldig_tot >= geldig_van)
);
CREATE INDEX IF NOT EXISTS idx_medewerker_contracten_org_mw
  ON medewerker_contracten (organisatie_id, medewerker_id, geldig_van);
ALTER TABLE medewerker_contracten ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Org members select medewerker_contracten" ON medewerker_contracten FOR SELECT USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members insert medewerker_contracten" ON medewerker_contracten FOR INSERT WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members update medewerker_contracten" ON medewerker_contracten FOR UPDATE USING (organisatie_id = auth_organisatie_id()) WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members delete medewerker_contracten" ON medewerker_contracten FOR DELETE USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('241_weekstaat_contracturen.sql') ON CONFLICT DO NOTHING;
