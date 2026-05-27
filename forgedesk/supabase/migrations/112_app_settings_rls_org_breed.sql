-- 112: app_settings RLS opschonen — puur organisatie-breed (W1)
--
-- app_settings is org-brede config (prefixes, BTW, API-keys, branding,
-- voorwaarden). Historisch bleven er per-user policies hangen naast de
-- org-policy. Die per-user policies lieten een medewerker een eigen row
-- aanmaken/lezen, wat de org-brede waarde kon maskeren (o.a. de
-- offerte-email kleur-bug). W1: elke medewerker mag app_settings lezen en
-- schrijven binnen de eigen organisatie.
--
-- Geen data-wijzigingen, alleen policies. Idempotent (re-runnable).

BEGIN;

-- Leftover per-user policies verwijderen
DROP POLICY IF EXISTS "Users can insert own app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can update own app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can view own app_settings"   ON public.app_settings;
-- Alleroudste naam uit migratie 001, voor omgevingen waar die nog bestaat
DROP POLICY IF EXISTS "Users see own data" ON public.app_settings;

-- Eén org-brede policy voor alle operaties, met org-check op zowel reads
-- (USING) als writes (WITH CHECK).
DROP POLICY IF EXISTS "Org members manage app_settings" ON public.app_settings;
CREATE POLICY "Org members manage app_settings" ON public.app_settings
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id());

COMMIT;
