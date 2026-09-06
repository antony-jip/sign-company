-- Reviewpunten septemberronde 2026.
--
-- 1. Projectsjablonen zonder klant: projecten.klant_id mag leeg zijn.
--    klant_naam was al nullable (001). Sjabloon-taken krijgen is_sjabloon
--    zodat de takenlijst ze zonder join kan overslaan; backfill voor wat er al
--    aan sjablonen staat.
-- 2. Handtekening uit de offertes-rij. Een PNG als data-URL is tot 200 kB en
--    reisde mee in elke select('*') op offertes. Eigen tabel, één rij per
--    offerte, alleen te lezen door org-leden; schrijven doet uitsluitend
--    api/offerte-accepteren via service_role. De kolom uit 235 is nog nergens
--    gevuld en gaat weg.
-- 3. planning_weergaven: een persoonlijke weergave (user_id gezet) is alleen
--    voor de eigenaar zichtbaar en wijzigbaar; gedeelde (user_id NULL) voor
--    de hele organisatie.
-- 4. medewerkers.uren_herinnerd_op: de eenmaal-per-dag-rem van de
--    urenherinnering, los van de notificaties-tabel.

BEGIN;

-- 1. Sjablonen
ALTER TABLE projecten ALTER COLUMN klant_id DROP NOT NULL;
ALTER TABLE projecten ALTER COLUMN klant_naam DROP NOT NULL;

ALTER TABLE taken ADD COLUMN IF NOT EXISTS is_sjabloon BOOLEAN NOT NULL DEFAULT false;
UPDATE taken t SET is_sjabloon = true
  FROM projecten p
  WHERE t.project_id = p.id AND p.is_template = true AND t.is_sjabloon = false;
CREATE INDEX IF NOT EXISTS idx_taken_sjabloon ON taken (organisatie_id) WHERE is_sjabloon = true;

-- 2. Handtekening
CREATE TABLE IF NOT EXISTS offerte_handtekeningen (
  offerte_id UUID PRIMARY KEY REFERENCES offertes(id) ON DELETE CASCADE,
  organisatie_id UUID NOT NULL,
  naam TEXT,
  data TEXT NOT NULL,
  getekend_op TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offerte_handtekeningen_org ON offerte_handtekeningen (organisatie_id);
ALTER TABLE offerte_handtekeningen ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Org members select offerte_handtekeningen" ON offerte_handtekeningen
    FOR SELECT USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Schrijven alleen via service_role (zelfde hardening als migratie 200).
REVOKE INSERT, UPDATE, DELETE ON public.offerte_handtekeningen FROM anon, authenticated;
REVOKE ALL ON public.offerte_handtekeningen FROM anon;
GRANT SELECT ON public.offerte_handtekeningen TO authenticated;
GRANT ALL ON public.offerte_handtekeningen TO service_role;

ALTER TABLE offertes DROP COLUMN IF EXISTS handtekening_data;

-- 3. Persoonlijke weergaven
DROP POLICY IF EXISTS "Org members select planning_weergaven" ON planning_weergaven;
DROP POLICY IF EXISTS "Org members insert planning_weergaven" ON planning_weergaven;
DROP POLICY IF EXISTS "Org members update planning_weergaven" ON planning_weergaven;
DROP POLICY IF EXISTS "Org members delete planning_weergaven" ON planning_weergaven;
CREATE POLICY "Org members select planning_weergaven" ON planning_weergaven
  FOR SELECT USING (organisatie_id = auth_organisatie_id() AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Org members insert planning_weergaven" ON planning_weergaven
  FOR INSERT WITH CHECK (organisatie_id = auth_organisatie_id() AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Org members update planning_weergaven" ON planning_weergaven
  FOR UPDATE USING (organisatie_id = auth_organisatie_id() AND (user_id IS NULL OR user_id = auth.uid()))
  WITH CHECK (organisatie_id = auth_organisatie_id() AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Org members delete planning_weergaven" ON planning_weergaven
  FOR DELETE USING (organisatie_id = auth_organisatie_id() AND (user_id IS NULL OR user_id = auth.uid()));

-- 4. Urenherinnering
ALTER TABLE medewerkers ADD COLUMN IF NOT EXISTS uren_herinnerd_op DATE;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('240_sjablonen_handtekening_weergaven.sql') ON CONFLICT DO NOTHING;
