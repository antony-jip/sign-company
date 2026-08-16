-- 217_billing_guard_trial_velden.sql
--
-- Dichten van de resterende billing-bypass via de trial-velden.
--
-- Migratie 172 gaf organisaties een trigger die de staffel- en
-- abonnementsvelden tegen zelf-schrijven beschermt (max_gebruikers,
-- abonnement_bedrag_excl, ai_maandlimiet, abonnement_status,
-- abonnement_actief_tot, mollie_customer_id, mollie_subscription_id). Drie
-- billing-velden bleven buiten die guard:
--
--   * trial_einde  -- api/cron-trial-expiration zet een org op 'verlopen' zodra
--                     trial_einde < now(). Een lid dat via een directe UPDATE
--                     zijn eigen trial_einde vooruitzet, wordt door de cron
--                     nooit opgepakt en omzeilt zo de paywall onbeperkt.
--   * trial_start  -- hoort bij trial_einde; samen bepalen ze het trialvenster.
--   * is_betaald   -- betaal-waarheid, alleen door billing-webhook/crons gezet.
--
-- Daarnaast dekte de INSERT-tak alleen de staffel af: een zelf-gemaakte
-- organisatie-rij (RLS-policy "Nieuwe gebruiker maakt eerste organisatie",
-- WITH CHECK op eigenaar_id) kon abonnement_status='actief', is_betaald=true of
-- een trial_einde ver in de toekomst meegeven. We forceren die velden op INSERT
-- nu naar dezelfde veilige defaults als de kolomdefaults uit migratie 029.
--
-- Service-role, postgres en de auth-admin passeren ongemoeid (eerste return),
-- dus billing-webhook, create-/cancel-subscription, cron-trial-expiration en
-- handle_new_user (SECURITY DEFINER, draait als postgres) blijven werken. De app
-- leest deze velden alleen; niets in de client-schrijfpaden raakt ze.

BEGIN;

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
    -- Billing/trial altijd op de veilige startwaarden; een zelf-gemaakte rij
    -- mag zichzelf niet als betaald of eeuwig-trial neerzetten.
    NEW.abonnement_status := 'trial';
    NEW.is_betaald := false;
    NEW.abonnement_actief_tot := NULL;
    NEW.mollie_customer_id := NULL;
    NEW.mollie_subscription_id := NULL;
    NEW.trial_start := NOW();
    NEW.trial_einde := NOW() + INTERVAL '30 days';
    RETURN NEW;
  END IF;

  IF NEW.max_gebruikers IS DISTINCT FROM OLD.max_gebruikers
     OR NEW.abonnement_bedrag_excl IS DISTINCT FROM OLD.abonnement_bedrag_excl
     OR NEW.ai_maandlimiet IS DISTINCT FROM OLD.ai_maandlimiet
     OR NEW.abonnement_status IS DISTINCT FROM OLD.abonnement_status
     OR NEW.abonnement_actief_tot IS DISTINCT FROM OLD.abonnement_actief_tot
     OR NEW.is_betaald IS DISTINCT FROM OLD.is_betaald
     OR NEW.trial_start IS DISTINCT FROM OLD.trial_start
     OR NEW.trial_einde IS DISTINCT FROM OLD.trial_einde
     OR NEW.mollie_customer_id IS DISTINCT FROM OLD.mollie_customer_id
     OR NEW.mollie_subscription_id IS DISTINCT FROM OLD.mollie_subscription_id THEN
    RAISE EXCEPTION
      'Staffel-, abonnements- en trialvelden zijn alleen via de backend te wijzigen';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger bestaat al sinds 172; idempotent herbevestigen kan geen kwaad.
DROP TRIGGER IF EXISTS organisaties_staffel_beschermen_trigger ON organisaties;
CREATE TRIGGER organisaties_staffel_beschermen_trigger
  BEFORE INSERT OR UPDATE ON organisaties
  FOR EACH ROW EXECUTE FUNCTION organisaties_staffel_beschermen();

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('217_billing_guard_trial_velden.sql') ON CONFLICT DO NOTHING;
