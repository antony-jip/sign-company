-- Migratie 114 — Werkbon canvas fase 1
-- Voegt layout JSONB toe aan werkbon_afbeeldingen voor canvas-editor.
-- Fase 1 shape: { blok_type: 'foto'|'logo', schaal_percentage: 0-100 }
-- Fase 2/3 breiden uit (tekst_positie, vrij_geplaatst, x_mm, y_mm, etc.)
-- Backward compat: lege layout '{}' + bestaande `grootte` enum blijft werken
-- via deriveFromGrootte fallback in werkbonService.ts.

ALTER TABLE werkbon_afbeeldingen
  ADD COLUMN IF NOT EXISTS layout JSONB NOT NULL DEFAULT '{}'::jsonb;
