-- ============================================================
-- Migration 002: Factuur Editor - ontbrekende kolommen
-- Voer dit uit in Supabase SQL Editor NA 001_missing_tables.sql
-- ============================================================

-- ============================================================
-- FACTUREN TABEL: ontbrekende kolommen toevoegen
-- ============================================================

-- Klant naam (gedenormaliseerd voor snelle weergave)
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS klant_naam TEXT;

-- Bron tracking (vanuit offerte/project/handmatig)
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_type TEXT CHECK (bron_type IN ('offerte', 'project', 'handmatig'));
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_offerte_id UUID REFERENCES offertes ON DELETE SET NULL;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bron_project_id UUID REFERENCES projecten ON DELETE SET NULL;

-- Factuur type (standaard, voorschot, creditnota, eindafrekening)
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS factuur_type TEXT DEFAULT 'standaard' CHECK (factuur_type IN ('standaard', 'voorschot', 'creditnota', 'eindafrekening'));
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS gerelateerde_factuur_id UUID REFERENCES facturen ON DELETE SET NULL;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS credit_reden TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS voorschot_percentage DECIMAL(5,2);
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS is_voorschot_verrekend BOOLEAN DEFAULT FALSE;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS verrekende_voorschot_ids UUID[];

-- Betaaltermijn & herinneringen
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaaltermijn_dagen INTEGER DEFAULT 30;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_1_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_2_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_3_verstuurd TIMESTAMPTZ;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS aanmaning_verstuurd TIMESTAMPTZ;

-- Werkbon koppeling
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS werkbon_id UUID;

-- Online betaling
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_token TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_link TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_methode TEXT DEFAULT 'handmatig' CHECK (betaal_methode IN ('handmatig', 'link', 'qr'));
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS online_bekeken BOOLEAN DEFAULT FALSE;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS online_bekeken_op TIMESTAMPTZ;

-- Intro/outro teksten (zoals offerte)
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS intro_tekst TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS outro_tekst TEXT;

-- Contactpersoon
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS contactpersoon_id TEXT;

-- ============================================================
-- APP SETTINGS: factuur-specifieke instellingen
-- ============================================================

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS factuur_prefix TEXT DEFAULT 'FAC';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS factuur_volgnummer INTEGER DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS factuur_betaaltermijn_dagen INTEGER DEFAULT 30;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS factuur_voorwaarden TEXT DEFAULT 'Betaling binnen 30 dagen na factuurdatum.';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS factuur_intro_tekst TEXT DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS factuur_outro_tekst TEXT DEFAULT '';

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_facturen_bron_offerte_id ON facturen(bron_offerte_id);
CREATE INDEX IF NOT EXISTS idx_facturen_bron_project_id ON facturen(bron_project_id);
CREATE INDEX IF NOT EXISTS idx_facturen_betaal_token ON facturen(betaal_token);
CREATE INDEX IF NOT EXISTS idx_facturen_factuur_type ON facturen(factuur_type);
