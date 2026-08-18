-- ============================================================
-- Migration 010: Ontbrekende kolommen in app_settings
-- Alle kolommen die in de TypeScript types staan maar niet
-- in eerdere migraties zijn aangemaakt.
-- ============================================================

-- Email
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS handtekening_afbeelding text DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS afzender_naam text DEFAULT '';

-- Offerte teksten
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS offerte_intro_tekst text DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS offerte_outro_tekst text DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS offerte_toon_m2 boolean DEFAULT true;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS offerte_regel_velden text[] DEFAULT '{}';

-- Factuur extra velden
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS creditnota_prefix text DEFAULT 'CN-';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS werkbon_prefix text DEFAULT 'WB-';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS herinnering_1_tekst text DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS herinnering_2_tekst text DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS aanmaning_tekst text DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS standaard_uurtarief numeric DEFAULT 75;
