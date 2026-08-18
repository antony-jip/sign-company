-- ============================================================
-- 022_werkbonnen.sql
-- Ontbrekende tabellen + kolom-aanvullingen voor werkbonnen
-- ============================================================

-- ============ 1. WERKBONNEN TABEL: ONTBREKENDE KOLOMMEN ============

-- offerte_id koppeling (optioneel, werkbon kan ook los van project)
ALTER TABLE werkbonnen
  ADD COLUMN IF NOT EXISTS offerte_id UUID REFERENCES offertes(id) ON DELETE SET NULL;

-- project_id nullable maken (werkbon kan aan offerte OF project hangen)
ALTER TABLE werkbonnen
  ALTER COLUMN project_id DROP NOT NULL;

-- Titel
ALTER TABLE werkbonnen
  ADD COLUMN IF NOT EXISTS titel TEXT;

-- Monteur feedback velden
ALTER TABLE werkbonnen
  ADD COLUMN IF NOT EXISTS uren_gewerkt NUMERIC;

ALTER TABLE werkbonnen
  ADD COLUMN IF NOT EXISTS monteur_opmerkingen TEXT;

-- PDF optie
ALTER TABLE werkbonnen
  ADD COLUMN IF NOT EXISTS toon_briefpapier BOOLEAN NOT NULL DEFAULT true;

-- Status uitbreiden: 'definitief' en 'afgerond' toevoegen
-- (bestaande constraint verwijderen en opnieuw aanmaken)
ALTER TABLE werkbonnen DROP CONSTRAINT IF EXISTS werkbonnen_status_check;
ALTER TABLE werkbonnen
  ADD CONSTRAINT werkbonnen_status_check
  CHECK (status IN ('concept', 'definitief', 'ingediend', 'goedgekeurd', 'afgerond', 'gefactureerd'));


-- ============ 2. WERKBON ITEMS (instructieblad) ============

CREATE TABLE IF NOT EXISTS werkbon_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  werkbon_id UUID NOT NULL REFERENCES werkbonnen(id) ON DELETE CASCADE,
  volgorde INTEGER NOT NULL DEFAULT 0,
  omschrijving TEXT NOT NULL DEFAULT '',
  afmeting_breedte_mm NUMERIC,
  afmeting_hoogte_mm NUMERIC,
  interne_notitie TEXT,
  offerte_item_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE werkbon_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own data" ON werkbon_items FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_werkbon_items_werkbon_id ON werkbon_items(werkbon_id);


-- ============ 3. WERKBON AFBEELDINGEN (per item) ============

CREATE TABLE IF NOT EXISTS werkbon_afbeeldingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  werkbon_item_id UUID NOT NULL REFERENCES werkbon_items(id) ON DELETE CASCADE,
  url TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('tekening', 'drukproef', 'foto', 'overig')),
  omschrijving TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Geen user_id nodig: toegang loopt via werkbon_items → werkbonnen RLS
ALTER TABLE werkbon_afbeeldingen ENABLE ROW LEVEL SECURITY;

-- RLS policy: toegang als de parent werkbon_item van de user is
CREATE POLICY "Users see own data" ON werkbon_afbeeldingen FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM werkbon_items wi
      WHERE wi.id = werkbon_afbeeldingen.werkbon_item_id
        AND wi.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_werkbon_afbeeldingen_item_id ON werkbon_afbeeldingen(werkbon_item_id);


-- ============ 4. EXTRA INDEXEN ============

CREATE INDEX IF NOT EXISTS idx_werkbonnen_offerte_id ON werkbonnen(offerte_id);
CREATE INDEX IF NOT EXISTS idx_werkbonnen_klant_id ON werkbonnen(klant_id);
