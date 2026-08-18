-- 177_melding_bij_taak_toewijzing.sql
--
-- Werk werd toegewezen zonder dat de ontvanger het merkte. Er bestond geen
-- notificatietype voor toewijzing, en dat was geen vergeten feature maar een
-- gevolg van het datamodel: taken.toegewezen_aan hield een naam, dus er was
-- geen gebruiker om naartoe te melden. Migratie 176 heeft daar
-- toegewezen_aan_id voor toegevoegd.
--
-- Waarom een trigger en niet de servicelaag: de RLS op notificaties is
-- user_id = auth.uid() (migratie 048, bewust persoonlijk). Een client kan dus
-- geen melding voor een collega wegschrijven. Een SECURITY DEFINER-trigger kan
-- dat wel, en werkt bovendien ongeacht welke client de taak toewijst: de app,
-- een API-route of een trigger-job.
--
-- Wat er bewust NIET gebeurt:
--   * geen melding als je een taak aan jezelf toewijst
--   * geen melding als de toewijzing niet verandert
--   * geen melding als de medewerker geen user_id heeft (nog niet ingelogd)
--   * de melding mislukt nooit de taak zelf: alles zit in een EXCEPTION-block,
--     want een taak opslaan is belangrijker dan de melding erover.

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

  -- Expliciet binnen de organisatie van de taak zoeken. De foreign key op
  -- medewerkers(id) controleert alleen dat de rij bestaat, en een FK-check loopt
  -- niet door RLS. Zonder deze voorwaarde kan iemand die een medewerker-uuid uit
  -- een ander bedrijf kent met een handmatige update een melding met zelfgekozen
  -- tekst in het postvak van een vreemde zetten. SECURITY DEFINER is de enige
  -- plek waar RLS niet meekijkt, dus de tenantcheck hoort hier in de code.
  SELECT user_id INTO ontvanger
    FROM medewerkers
   WHERE id = NEW.toegewezen_aan_id
     AND organisatie_id = NEW.organisatie_id;

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

REVOKE ALL ON FUNCTION meld_taak_toewijzing() FROM PUBLIC;

DROP TRIGGER IF EXISTS meld_taak_toewijzing_trigger ON taken;
CREATE TRIGGER meld_taak_toewijzing_trigger
  AFTER INSERT OR UPDATE OF toegewezen_aan_id ON taken
  FOR EACH ROW EXECUTE FUNCTION meld_taak_toewijzing();

COMMIT;

-- Controle: wijs een taak toe aan een collega en kijk of de melding er staat.
--   SELECT type, titel, user_id, created_at
--     FROM notificaties WHERE type = 'taak_toegewezen'
--    ORDER BY created_at DESC LIMIT 5;
--
-- Terugdraaien:
--   DROP TRIGGER IF EXISTS meld_taak_toewijzing_trigger ON taken;
--   DROP FUNCTION IF EXISTS meld_taak_toewijzing();
