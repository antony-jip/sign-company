-- 180_melding_ontvanger_binnen_organisatie.sql
--
-- Aanscherping van migratie 177. Die controleert de verkeerde kant.
--
-- 177 kijkt of de MEDEWERKER bij de organisatie van de taak hoort. Hij kijkt
-- niet of de ONTVANGER daar ook bij hoort, en dat zijn twee verschillende
-- dingen: medewerkers.user_id is vrij beschrijfbaar binnen de eigen organisatie,
-- want de policy uit 048 is FOR ALL USING (organisatie_id = auth_organisatie_id())
-- en zegt niets over user_id.
--
-- Twee gevolgen, waarvan het tweede geen aanvaller nodig heeft:
--
--   * Gericht: een lid maakt in zijn eigen organisatie een medewerkersrij aan
--     met de auth-uuid van een wildvreemde, wijst daar een taak aan toe, en de
--     trigger levert een melding af met een titel en tekst die hij zelf typt.
--     Je moet die uuid kennen, dus dit is phishing-materiaal en geen massa-
--     aanval, maar het staat wel in de bel van iemand die er niets mee te maken
--     heeft.
--   * Vanzelf: een oud-collega die naar een ander bedrijf is vertrokken maar
--     wiens medewerkersrij nog zijn user_id draagt, krijgt bij elke toewijzing
--     de titel en de volledige omschrijving van de taak toegestuurd. Migratie
--     176 noemt zelf dat deleteMedewerker wezen achterlaat.
--
-- De join op profiles dekt beide: de ontvanger moet zélf in de organisatie van
-- de taak zitten, en profiles.organisatie_id staat sinds 173 vast.

BEGIN;

CREATE OR REPLACE FUNCTION meld_taak_toewijzing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ontvanger uuid;
  toewijzer uuid := auth.uid();
BEGIN
  IF NEW.toegewezen_aan_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.toegewezen_aan_id IS NOT DISTINCT FROM OLD.toegewezen_aan_id THEN
    RETURN NEW;
  END IF;

  -- Zowel de medewerkersrij als de gebruiker erachter moet in de organisatie van
  -- de taak zitten. De foreign key op medewerkers(id) bewijst alleen dat de rij
  -- bestaat, en een FK-check loopt niet door RLS.
  SELECT m.user_id INTO ontvanger
    FROM medewerkers m
    JOIN profiles p ON p.id = m.user_id
   WHERE m.id = NEW.toegewezen_aan_id
     AND m.organisatie_id = NEW.organisatie_id
     AND p.organisatie_id = NEW.organisatie_id;

  IF ontvanger IS NULL OR ontvanger = toewijzer THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO notificaties (user_id, organisatie_id, type, titel, bericht, link, project_id)
    VALUES (
      ontvanger,
      NEW.organisatie_id,
      'taak_toegewezen',
      'Taak voor jou: ' || left(coalesce(NEW.titel, 'zonder titel'), 80),
      coalesce(NEW.beschrijving, ''),
      '/taken',
      NEW.project_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'meld_taak_toewijzing: melding mislukt voor taak %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMIT;

-- Controle: welke medewerkersrijen zouden hierdoor geen melding meer krijgen?
-- Dat zijn precies de wezen die het probleem waren.
--   SELECT m.id, m.naam, m.organisatie_id AS org_medewerker, p.organisatie_id AS org_profiel
--     FROM medewerkers m
--     JOIN profiles p ON p.id = m.user_id
--    WHERE m.organisatie_id IS DISTINCT FROM p.organisatie_id;
--
-- Terugdraaien: draai de functiedefinitie uit 177 opnieuw.
