-- Migratie 115 — Werkbon canvas feature-flag
-- Per-organisatie schakelaar voor fase-1-canvas-editor.
-- 0 = huidig (geen wijzigingen zichtbaar — instant rollback)
-- 1 = fase 1 ingeschakeld (drop-zones, logo-toggle, reorder, monteur-view)
-- 2/3 = toekomstige fasen.
-- Default 0: nieuwe en bestaande orgs zien fase-1-features alleen na expliciete activatie.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS werkbon_canvas_versie INT NOT NULL DEFAULT 0;
