-- Migration 035: Offerte opvolging systeem
-- Handmatig draaien in Supabase SQL Editor

-- ============================================================
-- 1. Opvolg schema's (per organisatie)
-- ============================================================
CREATE TABLE IF NOT EXISTS offerte_opvolg_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID REFERENCES organisaties(id) ON DELETE CASCADE,
  naam TEXT NOT NULL DEFAULT 'Standaard',
  is_default BOOLEAN DEFAULT false,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE offerte_opvolg_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org schemas"
  ON offerte_opvolg_schemas FOR SELECT
  USING (organisatie_id IN (
    SELECT organisatie_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage org schemas"
  ON offerte_opvolg_schemas FOR ALL
  USING (organisatie_id IN (
    SELECT organisatie_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 2. Opvolg stappen (per schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS offerte_opvolg_stappen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES offerte_opvolg_schemas(id) ON DELETE CASCADE,
  stap_nummer INTEGER NOT NULL,
  dagen_na_versturen INTEGER NOT NULL,
  actie TEXT NOT NULL CHECK (actie IN ('email_klant', 'melding_intern', 'email_en_melding')),
  onderwerp TEXT NOT NULL,
  inhoud TEXT NOT NULL,
  alleen_als_niet_bekeken BOOLEAN DEFAULT false,
  alleen_als_niet_gereageerd BOOLEAN DEFAULT true,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(schema_id, stap_nummer)
);

ALTER TABLE offerte_opvolg_stappen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schema stappen"
  ON offerte_opvolg_stappen FOR SELECT
  USING (schema_id IN (
    SELECT id FROM offerte_opvolg_schemas WHERE organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage schema stappen"
  ON offerte_opvolg_stappen FOR ALL
  USING (schema_id IN (
    SELECT id FROM offerte_opvolg_schemas WHERE organisatie_id IN (
      SELECT organisatie_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- ============================================================
-- 3. Opvolg log (per offerte)
-- ============================================================
CREATE TABLE IF NOT EXISTS offerte_opvolg_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offerte_id UUID REFERENCES offertes(id) ON DELETE CASCADE,
  stap_id UUID REFERENCES offerte_opvolg_stappen(id),
  actie TEXT NOT NULL,
  resultaat TEXT NOT NULL CHECK (resultaat IN ('verstuurd', 'overgeslagen_bekeken', 'overgeslagen_gereageerd', 'overgeslagen_inactief', 'fout')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opvolg_log_offerte ON offerte_opvolg_log(offerte_id);
CREATE INDEX IF NOT EXISTS idx_opvolg_log_created ON offerte_opvolg_log(created_at DESC);

ALTER TABLE offerte_opvolg_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own opvolg log"
  ON offerte_opvolg_log FOR SELECT
  USING (offerte_id IN (
    SELECT id FROM offertes WHERE user_id = auth.uid()
  ));

-- Service role can insert (Trigger.dev tasks)
CREATE POLICY "Service role can insert opvolg log"
  ON offerte_opvolg_log FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 4. Offerte-level opvolging velden
-- ============================================================
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS opvolging_actief BOOLEAN DEFAULT true;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS opvolging_schema_id UUID REFERENCES offerte_opvolg_schemas(id);
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS verzendwijze TEXT DEFAULT 'via_portaal' CHECK (verzendwijze IN ('via_portaal', 'via_email_pdf', 'via_handmatig'));

-- ============================================================
-- 5. Indexes for cron performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_offerte_opvolg_schemas_org ON offerte_opvolg_schemas(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_offerte_opvolg_stappen_schema ON offerte_opvolg_stappen(schema_id);
CREATE INDEX IF NOT EXISTS idx_offertes_opvolging ON offertes(status, opvolging_actief) WHERE status IN ('verzonden', 'bekeken');
