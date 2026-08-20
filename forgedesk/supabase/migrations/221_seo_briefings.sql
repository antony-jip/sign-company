-- Dagbriefing van de Claude Code-routine voor signcompany.nl/admin.
-- Eén rij per organisatie per dag; de routine upsert op (organisatie_id, datum).
-- inhoud = {samenvatting, opgepakt[], concurrenten[], prompts[]} — zie
-- api/kansen-agent.mjs in signcompany-next voor de vorm.
CREATE TABLE IF NOT EXISTS seo_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  datum DATE NOT NULL,
  inhoud JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisatie_id, datum)
);

ALTER TABLE seo_briefings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'seo_briefings' AND policyname = 'Org members manage seo_briefings'
  ) THEN
    CREATE POLICY "Org members manage seo_briefings" ON seo_briefings
      FOR ALL USING (organisatie_id = auth_organisatie_id())
      WITH CHECK (organisatie_id = auth_organisatie_id());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_seo_briefings_org_datum
  ON seo_briefings(organisatie_id, datum DESC);
