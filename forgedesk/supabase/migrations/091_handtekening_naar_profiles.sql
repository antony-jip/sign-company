BEGIN;

-- ============================================================
-- 091: Verplaats per-user velden uit app_settings naar profiles
--
-- Velden: email_handtekening, handtekening_afbeelding,
--         handtekening_afbeelding_grootte, afzender_naam,
--         sidebar_items.
--
-- Probleem: app_settings is org-breed (RLS op organisatie_id).
-- Bij multi-admin orgs overschrijven users elkaar.
--
-- Strategie:
-- 1. Kolommen op profiles toevoegen.
-- 2. Backfill: per user_id de meest recente app_settings rij
--    pakken en kopiëren naar de profile met datzelfde id.
-- 3. Velden in app_settings BLIJVEN staan (geen DROP COLUMN).
--    Verwijderen pas in vervolg-migratie nadat code aantoonbaar
--    nergens meer leest/schrijft.
--
-- Profile-RLS reeds aanwezig (geverifieerd):
--   SELECT: organisatie_id = auth_organisatie_id() OR id = auth.uid()
--   UPDATE: id = auth.uid()
--   INSERT: WITH CHECK id = auth.uid()
--   DELETE: id = auth.uid()
-- Geen policy-wijziging nodig in deze migratie.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_handtekening              TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS handtekening_afbeelding         TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS handtekening_afbeelding_grootte INTEGER NOT NULL DEFAULT 64,
  ADD COLUMN IF NOT EXISTS afzender_naam                   TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sidebar_items                   TEXT[]; -- NULL = gebruik UI-defaults

-- Backfill: meest recente app_settings rij per user_id
WITH laatste_per_user AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    email_handtekening,
    handtekening_afbeelding,
    handtekening_afbeelding_grootte,
    afzender_naam,
    sidebar_items
  FROM public.app_settings
  WHERE user_id IS NOT NULL
  ORDER BY user_id, updated_at DESC NULLS LAST
)
UPDATE public.profiles p
SET
  email_handtekening              = COALESCE(NULLIF(l.email_handtekening, ''),       p.email_handtekening),
  handtekening_afbeelding         = COALESCE(NULLIF(l.handtekening_afbeelding, ''),  p.handtekening_afbeelding),
  handtekening_afbeelding_grootte = COALESCE(l.handtekening_afbeelding_grootte,      p.handtekening_afbeelding_grootte),
  afzender_naam                   = COALESCE(NULLIF(l.afzender_naam, ''),            p.afzender_naam),
  sidebar_items                   = COALESCE(l.sidebar_items,                        p.sidebar_items),
  updated_at                      = NOW()
FROM laatste_per_user l
WHERE p.id = l.user_id;

COMMIT;
