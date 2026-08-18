-- 179_profiles_guard_upsert_bestendig.sql
--
-- SPOEDFIX op migratie 173. Die brak elke profielopslag in productie.
--
-- Wat er misging. De guard uit 173 gooit in de UPDATE-tak zodra rol of
-- organisatie_id verandert, en de redenering was: de upsert in
-- src/services/profielService.ts stuurt die kolommen ongewijzigd mee, dus
-- IS DISTINCT FROM laat hem door. Die redenering slaat de upsert-semantiek van
-- Postgres over.
--
-- Een PostgREST-upsert is INSERT ... ON CONFLICT (id) DO UPDATE SET kolom =
-- EXCLUDED.kolom. Postgres vuurt op zo'n statement eerst de BEFORE INSERT-trigger
-- af, en de effecten daarvan zitten IN de excluded-waarden. De INSERT-tak van
-- 173 zet organisatie_id op NULL en rol op 'medewerker'; precies die gemangelde
-- rij gaat vervolgens als EXCLUDED de UPDATE-tak in. Daar staat dan NULL tegen
-- de bestaande organisatie, en de trigger gooit.
--
-- Gevolg: naam, telefoon, functie, handtekening, bedrijfsgegevens en de
-- onboarding-stap konden niet meer opgeslagen worden. Voor iedereen. Alleen
-- uploadAvatar overleefde, want die doet een gewone .update().
--
-- Aangetoond met exact het statement dat PostgREST genereert, als rol
-- authenticated, in een teruggedraaide transactie:
--   ERROR P0001 ... at profiles_rol_en_org_beschermen() line 15 at RAISE
--
-- De fix. Zet in de UPDATE-tak terug naar de oude waarde in plaats van te
-- gooien. Dat is upsert-bestendig, want het maakt niet meer uit welke vorm de
-- client stuurt, en de escalatie blijft even hard geblokkeerd: rol en
-- organisatie_id komen simpelweg nooit meer uit de client. Stil terugzetten is
-- hier beter dan een foutmelding, want de gebruiker doet niets fout als hij zijn
-- naam opslaat.

BEGIN;

CREATE OR REPLACE FUNCTION profiles_rol_en_org_beschermen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.organisatie_id := NULL;
    NEW.rol := 'medewerker';
    RETURN NEW;
  END IF;

  -- Geen RAISE: zie de uitleg bovenaan. Wat de client ook meestuurt, deze twee
  -- kolommen houden hun bestaande waarde.
  NEW.rol := OLD.rol;
  NEW.organisatie_id := OLD.organisatie_id;
  RETURN NEW;
END;
$$;

COMMIT;

-- Controle, allebei in een teruggedraaide transactie als rol authenticated:
--   1. de upsert met de hele rij hoort nu te SLAGEN
--   2. UPDATE profiles SET rol = 'admin' hoort te slagen maar niets te wijzigen
--
-- Terugdraaien: draai de functiedefinitie uit 173 opnieuw. Doe dat alleen als
-- profielService.updateProfile eerst is omgebouwd naar een partiele .update(),
-- anders breekt het opnieuw.
