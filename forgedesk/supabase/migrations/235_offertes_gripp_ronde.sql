-- Offertes, Gripp-ronde september 2026.
--
-- 1. Afwijzen met reden op de offerte zelf (Gripp: Te duur / Te late levering /
--    Iets anders). Tot nu toe stond de verloren-reden alleen op de deal.
-- 2. Condities als set: Standaard of Spoed kiest geldigheid, betaaltermijn,
--    levertijd, betalingsconditie en voorwaarden in één keer. Spoed markeert
--    de offerte zodat het project bij akkoord prioriteit krijgt.
-- 3. Handtekening van de klant bij online akkoord, als data-URL.
-- 4. Staffelprijzen per calculatieproduct: vanaf een aantal een andere
--    inkoop- en verkoopprijs.
-- Alles nullable of met default; bestaande rijen veranderen niet.

BEGIN;

ALTER TABLE offertes ADD COLUMN IF NOT EXISTS afgewezen_reden TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS afgewezen_op TIMESTAMPTZ;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS conditie_id UUID;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS spoed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS handtekening_data TEXT;

CREATE TABLE IF NOT EXISTS offerte_condities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  naam TEXT NOT NULL,
  geldigheid_dagen INTEGER NOT NULL DEFAULT 30 CHECK (geldigheid_dagen >= 1),
  betaaltermijn_dagen INTEGER CHECK (betaaltermijn_dagen IS NULL OR betaaltermijn_dagen >= 0),
  levertijd TEXT,
  betalingsconditie TEXT,
  voorwaarden TEXT,
  spoed BOOLEAN NOT NULL DEFAULT false,
  volgorde INTEGER NOT NULL DEFAULT 0,
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offerte_condities_org ON offerte_condities (organisatie_id, volgorde);
ALTER TABLE offerte_condities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Org members select offerte_condities" ON offerte_condities FOR SELECT USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members insert offerte_condities" ON offerte_condities FOR INSERT WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members update offerte_condities" ON offerte_condities FOR UPDATE USING (organisatie_id = auth_organisatie_id()) WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members delete offerte_condities" ON offerte_condities FOR DELETE USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS calculatie_product_staffels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES calculatie_producten(id) ON DELETE CASCADE,
  vanaf_aantal NUMERIC(12,2) NOT NULL CHECK (vanaf_aantal > 0),
  inkoop_prijs NUMERIC(12,4),
  verkoop_prijs NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, vanaf_aantal)
);
CREATE INDEX IF NOT EXISTS idx_calc_staffels_product ON calculatie_product_staffels (product_id, vanaf_aantal);
ALTER TABLE calculatie_product_staffels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Org members select calculatie_product_staffels" ON calculatie_product_staffels FOR SELECT USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members insert calculatie_product_staffels" ON calculatie_product_staffels FOR INSERT WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members update calculatie_product_staffels" ON calculatie_product_staffels FOR UPDATE USING (organisatie_id = auth_organisatie_id()) WITH CHECK (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Org members delete calculatie_product_staffels" ON calculatie_product_staffels FOR DELETE USING (organisatie_id = auth_organisatie_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

INSERT INTO doen_migraties (bestand) VALUES ('235_offertes_gripp_ronde.sql') ON CONFLICT DO NOTHING;
