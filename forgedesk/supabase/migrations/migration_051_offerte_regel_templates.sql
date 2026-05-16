-- ============================================================
-- Migration 051: Named templates voor offerte-regel labels
--
-- Maakt de offerte_regel_templates kolom aan op app_settings.
-- Slaat een array op van { naam: string, labels: string[] } die
-- via het tandwieltje in de offerte-create UI beheerd wordt.
-- ============================================================

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS offerte_regel_templates jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN app_settings.offerte_regel_templates IS
  'Named templates voor offerte-regel labels. Array<{naam: string, labels: string[]}>.';
