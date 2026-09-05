-- Planning, Gripp-ronde september 2026.
--
-- 1. Opgeslagen weergaven: een naam plus de filterstand van het montagebord
--    (scope, week/maand, groepering, statusfilter) als JSONB. user_id NULL is
--    een gedeelde weergave voor de hele organisatie.
-- 2. Herhaald inplannen: een reeks afspraken wordt vooruit aangemaakt en wijst
--    met herhaling_bron_id naar de eerste; herhaling bewaart het recept
--    (frequentie, interval, tot) zodat de reeks later te herkennen is.

BEGIN;

CREATE TABLE IF NOT EXISTS planning_weergaven (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  user_id UUID,
  naam TEXT NOT NULL,
  instellingen JSONB NOT NULL DEFAULT '{}'::jsonb,
  volgorde INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planning_weergaven_org ON planning_weergaven (organisatie_id, volgorde);
ALTER TABLE planning_weergaven ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Org members select planning_weergaven" ON planning_weergaven FOR SELECT USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members insert planning_weergaven" ON planning_weergaven FOR INSERT WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members update planning_weergaven" ON planning_weergaven FOR UPDATE USING (organisatie_id = auth_organisatie_id()) WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members delete planning_weergaven" ON planning_weergaven FOR DELETE USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS herhaling_bron_id UUID;
ALTER TABLE montage_afspraken ADD COLUMN IF NOT EXISTS herhaling JSONB;
CREATE INDEX IF NOT EXISTS idx_montage_afspraken_herhaling ON montage_afspraken (herhaling_bron_id) WHERE herhaling_bron_id IS NOT NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('238_planning_gripp_ronde.sql') ON CONFLICT DO NOTHING;
