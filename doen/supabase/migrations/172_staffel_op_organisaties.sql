-- 172_staffel_op_organisaties.sql
--
-- De staffel als eigenschap van de organisatie.
--
-- Tot nu toe stond het gebruikersplafond hard in api/invite-team-member.ts, het
-- abonnementsbedrag hard in twee api-bestanden, en de AI-maandlimiet op
-- ai_usage_org. Dat laatste is een planwaarde op een verbruiksrij: hij bestaat
-- pas zodra er verbruik is, en staat per (organisatie, route, maand) opnieuw.
-- Alle drie horen bij het abonnement en staan vanaf nu op organisaties.
--
-- Staffel (ex btw):
--   tot 10 gebruikers   EUR 129   AI EUR 15
--   tot 20 gebruikers   EUR 199   AI EUR 30
--   tot 35 gebruikers   EUR 279   AI EUR 50
--
-- De twee bedragen zijn NULLABLE met terugval op de code-constanten (129 en
-- 15). Bestaande organisaties houden hun huidige gedrag zolang de kolommen leeg
-- zijn; er wordt bewust niets gebackfilled.
--
-- max_gebruikers krijgt WEL een default van 10, want "geen plafond" bestaat niet
-- en de invite-check moet altijd een getal hebben.

BEGIN;

ALTER TABLE organisaties
  ADD COLUMN IF NOT EXISTS max_gebruikers integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS abonnement_bedrag_excl numeric(10,2),
  ADD COLUMN IF NOT EXISTS ai_maandlimiet numeric(10,2);

COMMENT ON COLUMN organisaties.max_gebruikers IS
  'Aantal plekken in de staffel. Gehandhaafd door api/invite-team-member.';
COMMENT ON COLUMN organisaties.abonnement_bedrag_excl IS
  'Maandbedrag ex btw. NULL valt terug op de constante 129 in de api.';
COMMENT ON COLUMN organisaties.ai_maandlimiet IS
  'AI-budget per maand in euro. NULL valt terug op de constante 15 in de api.';

-- Waarom een trigger en geen policy.
--
-- Migratie 085 gaf elk lid UPDATE op zijn eigen organisatie, zonder WITH CHECK:
--   CREATE POLICY "Leden updaten eigen organisatie" ON organisaties
--     FOR UPDATE USING (id = auth_organisatie_id());
-- en INSERT met alleen een check op de eigenaar:
--   CREATE POLICY "Nieuwe gebruiker maakt eerste organisatie" ON organisaties
--     FOR INSERT WITH CHECK (eigenaar_id = auth.uid());
-- Zonder extra bescherming kan dus iedere gebruiker zijn eigen plafond ophogen,
-- zijn prijs op nul zetten en zijn AI-budget onbeperkt maken, via UPDATE én via
-- een verse INSERT. RLS kan niet per kolom, dus dit is een trigger op allebei.
--
-- Op UPDATE weigeren we een echte wijziging; een update die deze kolommen
-- ongemoeid laat gaat gewoon door. De app schrijft via updateOrganisatie altijd
-- losse velden, dus onboarding en bedrijfsgegevens raken dit niet.
--
-- Op INSERT zetten we terug naar de default in plaats van te gooien, zodat een
-- legitieme signup nooit stukloopt op deze trigger.
--
-- De rolbepaling gaat via current_user en niet via request.jwt.claims. PostgREST
-- zet de rol met SET LOCAL ROLE, dus current_user is de betrouwbare bron: het is
-- 'authenticated' of 'anon' voor een gebruiker, 'service_role' voor de backend,
-- en binnen de SECURITY DEFINER van handle_new_user de eigenaar van die functie.
-- Een JWT zonder role-claim of met kapotte JSON kan zo niet per ongeluk de deur
-- openzetten of elke UPDATE laten falen.

CREATE OR REPLACE FUNCTION organisaties_staffel_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.max_gebruikers := 10;
    NEW.abonnement_bedrag_excl := NULL;
    NEW.ai_maandlimiet := NULL;
    RETURN NEW;
  END IF;

  -- De abonnementskolommen uit 029 en 151 stonden onder dezelfde policy uit 085
  -- al open: een lid kon abonnement_status op 'actief' zetten en zo de paywall
  -- omzeilen. Ze horen in dezelfde guard. De app leest ze alleen (AuthContext,
  -- AbonnementTab, trial-reminder); geschreven worden ze uitsluitend door
  -- billing-webhook, create-subscription, cancel-subscription en
  -- cron-trial-expiration, en die draaien op service_role.
  IF NEW.max_gebruikers IS DISTINCT FROM OLD.max_gebruikers
     OR NEW.abonnement_bedrag_excl IS DISTINCT FROM OLD.abonnement_bedrag_excl
     OR NEW.ai_maandlimiet IS DISTINCT FROM OLD.ai_maandlimiet
     OR NEW.abonnement_status IS DISTINCT FROM OLD.abonnement_status
     OR NEW.abonnement_actief_tot IS DISTINCT FROM OLD.abonnement_actief_tot
     OR NEW.mollie_customer_id IS DISTINCT FROM OLD.mollie_customer_id
     OR NEW.mollie_subscription_id IS DISTINCT FROM OLD.mollie_subscription_id THEN
    RAISE EXCEPTION
      'Staffel- en abonnementsvelden zijn alleen via de backend te wijzigen';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organisaties_staffel_beschermen_trigger ON organisaties;
CREATE TRIGGER organisaties_staffel_beschermen_trigger
  BEFORE INSERT OR UPDATE ON organisaties
  FOR EACH ROW EXECUTE FUNCTION organisaties_staffel_beschermen();

COMMIT;

-- Controle na het draaien:
--   SELECT naam, max_gebruikers, abonnement_bedrag_excl, ai_maandlimiet
--     FROM organisaties ORDER BY naam;
--
-- Een organisatie op de tweede trede zetten (alleen als service_role of in de
-- SQL-editor):
--   UPDATE organisaties
--      SET max_gebruikers = 20, abonnement_bedrag_excl = 199, ai_maandlimiet = 30
--    WHERE id = '<organisatie_id>';
--
-- Terugdraaien:
--   DROP TRIGGER IF EXISTS organisaties_staffel_beschermen_trigger ON organisaties;
--   DROP FUNCTION IF EXISTS organisaties_staffel_beschermen();
--   ALTER TABLE organisaties
--     DROP COLUMN IF EXISTS max_gebruikers,
--     DROP COLUMN IF EXISTS abonnement_bedrag_excl,
--     DROP COLUMN IF EXISTS ai_maandlimiet;
