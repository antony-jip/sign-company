-- ============================================================
-- Migration 041: Fix Import System
-- 1. Opschonen live tabellen (verwijder james_pro imports)
-- 2. Contactpersonen kolommen fixen
-- 3. Verwijder import kolommen van live tabellen
-- 4. Zorg dat klant_historie tabel bestaat
-- ============================================================

-- STAP 1: Opschonen live tabellen
DELETE FROM offerte_items WHERE offerte_id IN (SELECT id FROM offertes WHERE import_bron = 'james_pro');
DELETE FROM offertes WHERE import_bron = 'james_pro';

DELETE FROM factuur_items WHERE factuur_id IN (SELECT id FROM facturen WHERE import_bron = 'james_pro');
DELETE FROM facturen WHERE import_bron = 'james_pro';

DELETE FROM projecten WHERE import_bron = 'james_pro';

-- STAP 2: Contactpersonen fixen
ALTER TABLE contactpersonen ADD COLUMN IF NOT EXISTS voornaam TEXT NOT NULL DEFAULT '';
ALTER TABLE contactpersonen ADD COLUMN IF NOT EXISTS achternaam TEXT NOT NULL DEFAULT '';
ALTER TABLE contactpersonen ADD COLUMN IF NOT EXISTS organisatie_id UUID;
ALTER TABLE contactpersonen ADD COLUMN IF NOT EXISTS notities TEXT DEFAULT '';

UPDATE contactpersonen
SET voornaam = split_part(naam, ' ', 1),
    achternaam = CASE
      WHEN position(' ' in naam) > 0 THEN substring(naam from position(' ' in naam) + 1)
      ELSE ''
    END
WHERE naam IS NOT NULL AND naam != '' AND (voornaam = '' OR voornaam IS NULL);

-- STAP 3: Verwijder import kolommen van live tabellen
ALTER TABLE offertes DROP COLUMN IF EXISTS import_bron;
ALTER TABLE offertes DROP COLUMN IF EXISTS import_metadata;
ALTER TABLE offertes DROP COLUMN IF EXISTS james_pro_id;

ALTER TABLE facturen DROP COLUMN IF EXISTS import_bron;
ALTER TABLE facturen DROP COLUMN IF EXISTS import_metadata;
ALTER TABLE facturen DROP COLUMN IF EXISTS james_pro_id;

ALTER TABLE projecten DROP COLUMN IF EXISTS import_bron;
ALTER TABLE projecten DROP COLUMN IF EXISTS import_metadata;
ALTER TABLE projecten DROP COLUMN IF EXISTS james_pro_id;

-- STAP 4: Zorg dat klant_historie tabel bestaat
CREATE TABLE IF NOT EXISTS klant_historie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  klant_id UUID REFERENCES klanten(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('project', 'offerte', 'factuur')),
  naam TEXT NOT NULL DEFAULT '',
  nummer TEXT DEFAULT '',
  datum DATE,
  bedrag NUMERIC(12,2),
  verantwoordelijke TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_klant_historie_org ON klant_historie(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_klant_historie_klant ON klant_historie(klant_id);
CREATE INDEX IF NOT EXISTS idx_klant_historie_type ON klant_historie(type);
