BEGIN;

-- ============================================================
-- 189 TERUGDRAAIEN — haalt bedrijfsprofielen er weer volledig uit.
--
-- Omdat 189 niets heeft gedropt en geen bestaande rij heeft aangeraakt, brengt
-- dit je exact terug op de situatie van ervoor. De enige data die verdwijnt is
-- wat je zelf ná de migratie hebt aangemaakt: de bedrijfsprofielen en de keuze
-- per offerte.
--
-- Draai dit alleen als de bijbehorende code NIET live staat. Andersom leest de
-- app straks een kolom die er niet meer is.
-- ============================================================

-- Controleer eerst wat je kwijtraakt:
--   SELECT COUNT(*) FROM public.bedrijfsprofielen;
--   SELECT COUNT(*) FROM public.offertes WHERE bedrijfsprofiel_id IS NOT NULL;

ALTER TABLE public.offertes DROP COLUMN IF EXISTS bedrijfsprofiel_id;

DROP TABLE IF EXISTS public.bedrijfsprofielen;

NOTIFY pgrst, 'reload schema';

COMMIT;
