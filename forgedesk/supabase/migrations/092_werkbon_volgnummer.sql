-- ============================================================
-- Migration 092: Startnummer voor werkbon-nummering
-- Eerder ontbrak app_settings.werkbon_volgnummer, waardoor het
-- start-nummer voor werkbonnen niet instelbaar was. Bestaande
-- nummergeneratie viel terug op MAX(nummer)+1 zonder floor.
-- ============================================================

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS werkbon_volgnummer integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN app_settings.werkbon_volgnummer IS
  'Startnummer voor werkbon-nummering. Fungeert als floor bij MAX(nummer)+1 generatie zodat een organisatie bij overstap vanuit een ander systeem een specifiek beginpunt kan kiezen.';
