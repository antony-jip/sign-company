-- 059: Briefpapier layout — safe zones en branding override
-- Wordt alleen toegepast wanneer een briefpapier is geüpload.

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS briefpapier_safe_zone_boven INTEGER NOT NULL DEFAULT 0;

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS briefpapier_safe_zone_onder INTEGER NOT NULL DEFAULT 0;

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS briefpapier_safe_zone_links INTEGER NOT NULL DEFAULT 0;

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS briefpapier_safe_zone_rechts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS briefpapier_toon_branding BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE document_styles
  ADD COLUMN IF NOT EXISTS tabel_header_tekst_kleur TEXT NOT NULL DEFAULT '#FFFFFF';
