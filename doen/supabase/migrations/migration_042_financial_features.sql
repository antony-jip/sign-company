-- Migration 042: Financial Features
-- Grootboek per factuurregel, Creditfactuur verbeteringen, Kostenplaatsen

-- ============================================================
-- DEEL 1: Grootboek per factuurregel
-- ============================================================

ALTER TABLE factuur_items ADD COLUMN IF NOT EXISTS grootboek_code TEXT DEFAULT '';
ALTER TABLE offerte_items ADD COLUMN IF NOT EXISTS grootboek_code TEXT DEFAULT '';

-- ============================================================
-- DEEL 2: Creditfactuur — credit_voor_factuur_id
-- (factuur_type bestaat al op de facturen tabel)
-- ============================================================

ALTER TABLE facturen ADD COLUMN IF NOT EXISTS credit_voor_factuur_id UUID REFERENCES facturen(id);

-- ============================================================
-- DEEL 3: Kostenplaatsen
-- ============================================================

CREATE TABLE IF NOT EXISTS kostenplaatsen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  code TEXT NOT NULL,
  naam TEXT NOT NULL,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE facturen ADD COLUMN IF NOT EXISTS kostenplaats_id UUID REFERENCES kostenplaatsen(id);
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS kostenplaats_id UUID REFERENCES kostenplaatsen(id);
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS kostenplaats_id UUID REFERENCES kostenplaatsen(id);

-- RLS policies voor kostenplaatsen
ALTER TABLE kostenplaatsen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kostenplaatsen" ON kostenplaatsen
  FOR SELECT USING (true);

CREATE POLICY "Users can insert kostenplaatsen" ON kostenplaatsen
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update kostenplaatsen" ON kostenplaatsen
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete kostenplaatsen" ON kostenplaatsen
  FOR DELETE USING (true);
