-- Migration 111: trial write-lock op kern-tabellen
-- Antony draait deze handmatig in Supabase SQL Editor.
--
-- Achtergrond:
-- Bestaande RLS uit migratie 048 doet alleen organisatie_id-isolatie. Een user
-- met verlopen trial kan via directe Supabase-client-calls (devtools, curl met
-- JWT) nog steeds offertes/facturen/klanten/etc. INSERTEN of UPDATEN.
-- De client-side useTrialGuard is geen bescherming op DB-niveau.
--
-- Aanpak:
-- 1. Helper function auth_abonnement_actief() — returneert false als de org
--    van de ingelogde user status 'verlopen' of 'opgezegd' heeft.
-- 2. Replace "Org members manage X" policies met dezelfde USING-clause maar
--    een striktere WITH CHECK die ook auth_abonnement_actief() vereist.
--
-- Gevolg:
-- - SELECT blijft werken (user kan inloggen, data zien) → onaangetast
-- - DELETE blijft werken (USING-only, geen WITH CHECK) → onaangetast
-- - INSERT geblokkeerd bij verlopen trial → 'new row violates row-level security'
-- - UPDATE geblokkeerd bij verlopen trial → idem
--
-- Service_role (cron jobs, Stripe webhook) bypasst RLS → onaangetast.
--
-- Tabellen die NIET geraakt worden:
-- - medewerkers (toegangsbeheer moet werken)
-- - app_settings (user moet abonnement kunnen reactiveren)
-- - profiles, emails, audit_log (persoonlijk / system-managed)
-- - leveranciers, voorraad_artikelen, calculatie_*, document_styles,
--   herinnering_templates, events, tijdregistraties, verlof, bestelbonnen,
--   leveringsbonnen, project_portalen (lagere prioriteit; volgt in latere sprint)
--
-- Status-waarden (bevestigd via api/cron-trial-expiration.ts, api/stripe-webhook.ts):
-- 'trial' / 'actief' → toegestaan
-- 'verlopen' / 'opgezegd' → geblokkeerd

-- ──────────────────────────────────────────────────────────────────
-- Helper function
-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_abonnement_actief() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM organisaties
    WHERE id = auth_organisatie_id()
      AND abonnement_status IN ('verlopen', 'opgezegd')
  )
$$;

-- ──────────────────────────────────────────────────────────────────
-- Kern write-tabellen
-- ──────────────────────────────────────────────────────────────────

-- KLANTEN
DROP POLICY IF EXISTS "Org members manage klanten" ON klanten;
CREATE POLICY "Org members manage klanten" ON klanten
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- PROJECTEN
DROP POLICY IF EXISTS "Org members manage projecten" ON projecten;
CREATE POLICY "Org members manage projecten" ON projecten
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- TAKEN
DROP POLICY IF EXISTS "Org members manage taken" ON taken;
CREATE POLICY "Org members manage taken" ON taken
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- OFFERTES
DROP POLICY IF EXISTS "Org members manage offertes" ON offertes;
CREATE POLICY "Org members manage offertes" ON offertes
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- FACTUREN
DROP POLICY IF EXISTS "Org members manage facturen" ON facturen;
CREATE POLICY "Org members manage facturen" ON facturen
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- WERKBONNEN
DROP POLICY IF EXISTS "Org members manage werkbonnen" ON werkbonnen;
CREATE POLICY "Org members manage werkbonnen" ON werkbonnen
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- MONTAGE_AFSPRAKEN
DROP POLICY IF EXISTS "Org members manage montage_afspraken" ON montage_afspraken;
CREATE POLICY "Org members manage montage_afspraken" ON montage_afspraken
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- DEALS
DROP POLICY IF EXISTS "Org members manage deals" ON deals;
CREATE POLICY "Org members manage deals" ON deals
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- UITGAVEN
DROP POLICY IF EXISTS "Org members manage uitgaven" ON uitgaven;
CREATE POLICY "Org members manage uitgaven" ON uitgaven
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- INKOOPFACTUREN (uit migration_050_inkoopfacturen_module.sql)
DROP POLICY IF EXISTS "Org members manage inkoopfacturen" ON inkoopfacturen;
CREATE POLICY "Org members manage inkoopfacturen" ON inkoopfacturen
  FOR ALL
  USING (organisatie_id = auth_organisatie_id())
  WITH CHECK (organisatie_id = auth_organisatie_id() AND auth_abonnement_actief());

-- ──────────────────────────────────────────────────────────────────
-- Verificatie-queries (handmatig draaien na migratie):
--
-- 1. Check helper-function bestaat:
--    SELECT proname FROM pg_proc WHERE proname = 'auth_abonnement_actief';
--
-- 2. Check policies geüpdatet zijn (zou WITH CHECK moeten tonen):
--    SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_clause,
--           pg_get_expr(polwithcheck, polrelid) AS with_check_clause
--    FROM pg_policy
--    WHERE polname LIKE 'Org members manage %'
--    ORDER BY polname;
--
-- 3. Test als verlopen-user (vervang <user_jwt>):
--    -- Verwacht: 'new row violates row-level security policy' bij INSERT
-- ──────────────────────────────────────────────────────────────────
