BEGIN;

-- ============================================================
-- 093: Dedupe document_styles + app_settings per organisatie_id
--
-- Achtergrond: sinds migratie 047 hebben beide tabellen een
-- organisatie_id-kolom (gebackfilled vanuit profiles), en sinds
-- 048 een org-scoped RLS-policy. Er bestaat echter geen unique
-- constraint op organisatie_id, dus historisch zijn er meerdere
-- rijen per org ontstaan (één per medewerker die ooit door de
-- per-user-insertpaden is gegaan). De code gaat in dezelfde
-- commit-reeks org-first lezen; deze migratie zorgt dat er per
-- organisatie maximaal één rij overblijft.
--
-- Strategie: behoud de meest recent geüpdate rij (tie-break op
-- created_at) per organisatie_id; verwijder de rest.
--
-- Unique indexen worden bewust NIET in deze migratie toegevoegd
-- — eerst moeten ook alle write-paden org-scoped zijn (Fase 2),
-- anders breken bestaande user-scoped INSERTs.
--
-- DRAAI DIT HANDMATIG in de Supabase SQL Editor.
-- Veilig om opnieuw te draaien (idempotent na eerste run).
-- ============================================================

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY organisatie_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.document_styles
  WHERE organisatie_id IS NOT NULL
)
DELETE FROM public.document_styles
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY organisatie_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.app_settings
  WHERE organisatie_id IS NOT NULL
)
DELETE FROM public.app_settings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

COMMIT;

-- ============================================================
-- VERIFICATIE — handmatig draaien na de migratie
-- ============================================================
--
-- Geen duplicaten meer per org:
--   SELECT organisatie_id, COUNT(*) FROM public.document_styles
--     WHERE organisatie_id IS NOT NULL
--     GROUP BY 1 HAVING COUNT(*) > 1;
--   SELECT organisatie_id, COUNT(*) FROM public.app_settings
--     WHERE organisatie_id IS NOT NULL
--     GROUP BY 1 HAVING COUNT(*) > 1;
--   (beide moeten 0 rijen geven)
--
-- Orgs zonder rij (verwacht — code valt terug op defaults):
--   SELECT o.id, o.naam FROM public.organisaties o
--     LEFT JOIN public.app_settings a ON a.organisatie_id = o.id
--    WHERE a.id IS NULL;
--   SELECT o.id, o.naam FROM public.organisaties o
--     LEFT JOIN public.document_styles d ON d.organisatie_id = o.id
--    WHERE d.id IS NULL;
--
-- Legacy rijen zonder organisatie_id (worden niet aangeraakt door
-- deze migratie; code valt terug op user_id-lookup):
--   SELECT COUNT(*) FROM public.document_styles WHERE organisatie_id IS NULL;
--   SELECT COUNT(*) FROM public.app_settings    WHERE organisatie_id IS NULL;
