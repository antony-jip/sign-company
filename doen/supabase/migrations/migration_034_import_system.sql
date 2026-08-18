-- ============================================================
-- Migration 034: Data Import System
-- Contactpersonen, Klant Historie, Import Logs
-- ============================================================

-- Contactpersonen tabel
CREATE TABLE IF NOT EXISTS contactpersonen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  voornaam TEXT NOT NULL DEFAULT '',
  achternaam TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  telefoon TEXT DEFAULT '',
  functie TEXT DEFAULT '',
  notities TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_contactpersonen_org ON contactpersonen(organisatie_id);
CREATE INDEX IF NOT EXISTS idx_contactpersonen_klant ON contactpersonen(klant_id);
CREATE INDEX IF NOT EXISTS idx_contactpersonen_email ON contactpersonen(email);

-- Klant historie tabel (geïmporteerde projecten, offertes, facturen)
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

-- Import logs tabel
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  bestandsnaam TEXT DEFAULT '',
  aantal_rijen INTEGER NOT NULL DEFAULT 0,
  aantal_geimporteerd INTEGER NOT NULL DEFAULT 0,
  aantal_overgeslagen INTEGER NOT NULL DEFAULT 0,
  aantal_fouten INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'voltooid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kolom toevoegen aan klanten
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS import_bron TEXT DEFAULT '';

-- RLS wordt later toegevoegd — tabellen zijn nu open voor snelle import
