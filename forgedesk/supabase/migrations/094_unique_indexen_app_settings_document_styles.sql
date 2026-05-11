BEGIN;

-- ============================================================
-- 094: Unique index op organisatie_id voor document_styles en app_settings
--
-- Vereist: migratie 093 (dedupe) reeds gedraaid, en de code-fixes uit
-- Fase 1 + 2a + 2b zijn live. Alle read- én write-paden gaan nu eerst
-- via organisatie_id; INSERT-paden checken expliciet of er al een rij
-- per org bestaat (UPDATE-by-id), dus deze index veroorzaakt geen
-- 23505 bij normaal gebruik.
--
-- Partial index laat NULL toe voor legacy rijen zonder organisatie_id.
-- Die rijen worden door de code als user-scoped fallback bediend en
-- raken niet aan elkaars uniciteitsdomein.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_document_styles_organisatie
  ON public.document_styles(organisatie_id)
  WHERE organisatie_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_app_settings_organisatie
  ON public.app_settings(organisatie_id)
  WHERE organisatie_id IS NOT NULL;

COMMIT;

-- ============================================================
-- VERIFICATIE — handmatig draaien na de migratie
-- ============================================================
--
-- Beide indexen aanwezig (moet 2 rijen geven):
--   SELECT indexname, indexdef FROM pg_indexes
--    WHERE tablename IN ('document_styles', 'app_settings')
--      AND indexname LIKE 'uniq_%';
--
-- Nog steeds geen duplicaten per org (moet 0 rijen geven):
--   SELECT organisatie_id, COUNT(*) FROM public.document_styles
--    WHERE organisatie_id IS NOT NULL
--    GROUP BY 1 HAVING COUNT(*) > 1;
--   SELECT organisatie_id, COUNT(*) FROM public.app_settings
--    WHERE organisatie_id IS NOT NULL
--    GROUP BY 1 HAVING COUNT(*) > 1;
