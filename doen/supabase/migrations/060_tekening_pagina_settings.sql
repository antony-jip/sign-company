-- 060: Instellingen voor tekening / bijlage pagina's bij offertes
-- - kleurmodus + eigen kleur voor specs-balk
-- - logo positie op tekening pagina

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS tekening_specs_kleur_modus TEXT NOT NULL DEFAULT 'brand'
    CHECK (tekening_specs_kleur_modus IN ('brand', 'neutraal', 'eigen'));

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS tekening_specs_eigen_kleur TEXT;

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS tekening_logo_positie TEXT NOT NULL DEFAULT 'linksboven'
    CHECK (tekening_logo_positie IN ('linksboven', 'rechtsboven', 'geen'));

-- Herlaad PostgREST schema cache na DDL wijzigingen
NOTIFY pgrst, 'reload schema';
