-- Migratie 116 — Werkbon canvas fase 3
-- Documentatie-only: canvas-coördinaten leven in bestaande layout JSONB
-- (toegevoegd in migratie 114). Geen kolom-toevoegingen, geen RLS-wijzigingen.
-- Backward-compat: items zonder canvas_*_mm rendert PDF via flow-pad.
-- Idempotent: COMMENT-statements zijn re-runnable.

COMMENT ON COLUMN werkbon_afbeeldingen.layout IS
  'JSONB layout per afbeelding. Velden:
   - blok_type: foto | logo | pdf (fase 1+2)
   - schaal_percentage: 0-100 (fase 1+2, legacy bij versie<3)
   - tekst_positie: links | rechts | boven | onder (fase 2, legacy bij versie<3)
   - volgorde: array-index voor thumbnail-reorder (fase 1, legacy bij versie<3)
   - pdf_bron_url: storage-pad origineel PDF (fase 2)
   - canvas_x_mm, canvas_y_mm: absolute positie op item-canvas (fase 3)
   - canvas_breedte_mm, canvas_hoogte_mm: element-grootte op canvas (fase 3)
   - z_index: stacking, default 1 voor foto/pdf, 2 voor logo (fase 3)
   Werkruimte canvas = 267mm breed x 100mm hoog (landscape A4 minus 15mm marges).';
