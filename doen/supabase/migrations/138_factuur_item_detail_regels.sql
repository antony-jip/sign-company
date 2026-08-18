-- Migration 138: optionele detailregels per factuurregel (label/waarde),
-- zoals offerte_items.detail_regels. Voor extra uitleg bij een regel die
-- ook op de factuur/PDF onder de omschrijving verschijnt.
--
-- Antony draait deze handmatig in de Supabase SQL Editor.

ALTER TABLE factuur_items
  ADD COLUMN IF NOT EXISTS detail_regels JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN factuur_items.detail_regels IS
  'Array van { id, label, waarde } met extra toelichting per regel; verschijnt onder de omschrijving op de factuur';
