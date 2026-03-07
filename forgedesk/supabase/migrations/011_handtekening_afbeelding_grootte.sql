-- ============================================================
-- Migration 011: Afbeelding grootte voor email handtekening
-- Sla de gewenste hoogte (in px) op van de handtekening-afbeelding
-- ============================================================

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS handtekening_afbeelding_grootte integer DEFAULT 64;
