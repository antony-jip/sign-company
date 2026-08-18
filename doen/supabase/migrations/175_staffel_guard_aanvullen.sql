-- 175_staffel_guard_aanvullen.sql
--
-- Twee losse eindjes uit de review op 172 en 174. Beide migraties draaiden al,
-- dus dit is een aanvulling en geen wijziging aan die bestanden.
--
-- 1 · De INSERT-tak van organisaties_staffel_beschermen zette alleen de drie
--     staffelkolommen terug, niet de vier abonnementskolommen die later aan de
--     UPDATE-guard zijn toegevoegd. Vandaag is dat onschadelijk, maar alleen
--     omdat migratie 173 voorkomt dat iemand zijn profiel naar een zelfgemaakte
--     organisatie verplaatst. Die afhankelijkheid tussen twee migraties is
--     onzichtbaar voor wie later 173 aanpast, dus de guard hoort op zichzelf te
--     staan.
--
-- 2 · De afscherming van ai_usage_org_bijschrijf zit volledig in de
--     REVOKE-regels van 174. CREATE OR REPLACE behoudt de grants, maar een
--     latere migratie die DROP plus CREATE doet zet EXECUTE weer op PUBLIC.
--     Dat staat nu als comment op de functie zelf, zodat het zichtbaar is voor
--     wie hem opzoekt in de database in plaats van in de repo.

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
    NEW.max_gebruikers         := 10;
    NEW.abonnement_bedrag_excl := NULL;
    NEW.ai_maandlimiet         := NULL;
    NEW.abonnement_actief_tot  := NULL;
    NEW.mollie_customer_id     := NULL;
    NEW.mollie_subscription_id := NULL;
    -- abonnement_status blijft over aan de kolomdefault (trial), want de app
    -- maakt een organisatie aan met die waarde en dat is de bedoeling.
    RETURN NEW;
  END IF;

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

COMMENT ON FUNCTION ai_usage_org_bijschrijf(uuid, text, text, numeric, integer) IS
  'Atomair bijschrijven van AI-verbruik (migratie 174). LET OP: de afscherming '
  'zit in de REVOKE-regels van 174. CREATE OR REPLACE behoudt die, maar DROP '
  'FUNCTION gevolgd door CREATE zet EXECUTE terug op PUBLIC en dan kan elke '
  'ingelogde gebruiker zijn eigen verbruik wegschrijven. Herhaal de REVOKE als '
  'je de functie ooit dropt.';

COMMIT;

-- Controle: als gewone gebruiker een organisatie aanmaken met een verzonnen
-- mollie_customer_id hoort NULL op te leveren.
--
-- Terugdraaien: draai de functiedefinitie uit 172 opnieuw.
