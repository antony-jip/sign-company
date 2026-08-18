-- Migration 036: Import kolommen voor James PRO en toekomstige imports
-- Handmatig draaien in Supabase SQL Editor

-- Klanten
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS james_pro_id TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS import_bron TEXT;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS import_datum TIMESTAMPTZ;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS import_metadata JSONB DEFAULT '{}';

-- Projecten
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS import_bron TEXT;
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS import_metadata JSONB DEFAULT '{}';

-- Offertes
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS import_bron TEXT;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS import_metadata JSONB DEFAULT '{}';

-- Facturen
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS import_bron TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS import_metadata JSONB DEFAULT '{}';

-- Index voor snelle lookup op james_pro_id
CREATE INDEX IF NOT EXISTS idx_klanten_james_pro_id ON klanten(james_pro_id) WHERE james_pro_id IS NOT NULL;

-- Unique index voor upsert (per user, genormaliseerde bedrijfsnaam)
CREATE UNIQUE INDEX IF NOT EXISTS idx_klanten_user_bedrijfsnaam
  ON klanten(user_id, lower(trim(bedrijfsnaam)));
